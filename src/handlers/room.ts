import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import roomModel from "../models/room.js";
import bookingModel from "../models/booking.js";
import rateModel from "../models/rating.js";
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from "../utils/responseFormatter.js";
import { logger } from "../utils/logger.js";
import { Types } from "mongoose";
import {
  AuthenticatedRequest,
  RequestWithParsedQuery,
} from "../types/express.js";
import type { RoomQuery } from "../validation/room.js";

const SORTABLE_ROOM_FIELDS = new Set(["createdAt", "price.base", "maxPeople"]);

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

function isCastError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "CastError"
  );
}

function toSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

/**
 * Create new room
 */
export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const room = await roomModel.create(req.body);
    const populatedRoom = await room.populate([
      { path: "hotel", select: "name city address" },
      { path: "createdBy", select: "fullName displayName email avatar" },
    ]);

    successResponse(
      res,
      populatedRoom,
      "Room created successfully",
      StatusCodes.CREATED,
    );
  } catch (error) {
    logger.error("Error creating room:", { error });
    const err = error as Error & { code?: number };
    if (isDuplicateKeyError(error)) {
      errorResponse(
        res,
        err,
        "A room with this data already exists or violates a unique constraint",
        StatusCodes.CONFLICT,
      );
    } else {
      errorResponse(res, err, "Failed to create room", StatusCodes.BAD_REQUEST);
    }
  }
}

/**
 * Get all rooms with pagination, filtering and sorting
 */
export async function getRooms(req: Request, res: Response): Promise<void> {
  try {
    const parsedReq = req as unknown as RequestWithParsedQuery<RoomQuery>;

    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = -1,
      search,
      hotel,
      minPrice,
      maxPrice,
      maxPeople,
      isAvailable,
    } = parsedReq.parsedQuery;

    const safeSortBy = SORTABLE_ROOM_FIELDS.has(sortBy) ? sortBy : "createdAt";

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (hotel) {
      filter.hotel = new Types.ObjectId(hotel);
    }

    if (maxPeople !== undefined) {
      filter.maxPeople = { $gte: maxPeople };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter["price.base"] = {} as Record<string, number>;
      const priceFilter = filter["price.base"] as Record<string, number>;
      if (minPrice !== undefined) {
        priceFilter.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceFilter.$lte = maxPrice;
      }
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable;
    }

    const [rooms, total] = await Promise.all([
      roomModel
        .find(filter)
        .populate("hotel", "name city address")
        .populate("createdBy", "fullName displayName email avatar")
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ [safeSortBy]: sortOrder })
        .lean(),
      roomModel.countDocuments(filter),
    ]);

    paginatedResponse(
      res,
      rooms,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      "Rooms fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching rooms:", { error });
    errorResponse(res, error, "Failed to fetch rooms");
  }
}

/**
 * Get single room by ID
 */
export async function getRoomById(req: Request, res: Response): Promise<void> {
  const id = toSingleParam(req.params.id);
  try {
    const room = await roomModel
      .findById(id)
      .populate("hotel", "name city address")
      .populate("createdBy", "fullName displayName email avatar");

    if (!room) {
      errorResponse(res, null, "Room not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, room, "Room fetched successfully");
  } catch (error) {
    logger.error("Error fetching room:", { error });
    if (isCastError(error)) {
      errorResponse(
        res,
        error,
        `Invalid room id: ${id}`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }
    errorResponse(res, error, `Failed to fetch room ${id}`);
  }
}

/**
 * Update room
 */
export async function updateRoom(req: Request, res: Response): Promise<void> {
  const id = toSingleParam(req.params.id);
  try {
    const room = await roomModel
      .findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true },
      )
      .populate("hotel", "name city address")
      .populate("createdBy", "fullName displayName email avatar");

    if (!room) {
      errorResponse(res, null, "Room not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, room, "Room updated successfully");
  } catch (error) {
    logger.error("Error updating room:", { error });
    const err = error as Error & { code?: number };
    if (isDuplicateKeyError(error)) {
      errorResponse(
        res,
        err,
        "Update conflicts with an existing unique value",
        StatusCodes.CONFLICT,
      );
    } else if (isCastError(error)) {
      errorResponse(
        res,
        err,
        `Invalid room id: ${id}`,
        StatusCodes.BAD_REQUEST,
      );
    } else {
      errorResponse(res, err, `Failed to update room ${id}`);
    }
  }
}

/**
 * Delete room
 */
export async function deleteRoom(req: Request, res: Response): Promise<void> {
  const id = toSingleParam(req.params.id);
  try {
    const activeBookings = await bookingModel.countDocuments({
      room: id,
      status: { $in: ["pending", "confirmed", "checked_in"] },
    });

    if (activeBookings > 0) {
      errorResponse(
        res,
        null,
        `Cannot delete room with ${activeBookings} active booking(s)`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const room = await roomModel.findByIdAndDelete(id);

    if (!room) {
      errorResponse(res, null, "Room not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, null, "Room deleted successfully");
  } catch (error) {
    logger.error("Error deleting room:", { error });
    if (isCastError(error)) {
      errorResponse(
        res,
        error,
        `Invalid room id: ${id}`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }
    errorResponse(res, error, `Failed to delete room ${id}`);
  }
}

/**
 * Get room ratings
 */
export async function getRoomRatings(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const roomId = toSingleParam(req.params.id);

    const ratings = await rateModel
      .find({ roomId })
      .populate("ratedBy", "fullName displayName avatar")
      .sort({ createdAt: -1 })
      .lean();

    successResponse(res, ratings, "Ratings fetched successfully");
  } catch (error) {
    logger.error("Error fetching room ratings:", { error });
    errorResponse(res, error, "Failed to fetch ratings");
  }
}

/**
 * Add rating to room
 */
export async function addRoomRating(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const roomId = toSingleParam(req.params.id);
    const { rating } = req.body as { rating: number };
    const userId = authReq.user._id;

    const hasCheckedOut = await bookingModel.exists({
      user: userId,
      room: roomId,
      status: "checked_out",
    });

    if (!hasCheckedOut) {
      errorResponse(
        res,
        null,
        "You can only rate a room after checking out",
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    const existingRating = await rateModel.findOne({
      ratedBy: userId,
      roomId,
    });

    if (existingRating) {
      errorResponse(
        res,
        null,
        "You have already rated this room",
        StatusCodes.CONFLICT,
      );
      return;
    }

    const ratingDoc = await rateModel.create({
      ratedBy: userId,
      roomId,
      rating,
    });
    await ratingDoc.populate("ratedBy", "fullName displayName avatar");

    successResponse(res, ratingDoc, "Rating added");
  } catch (error) {
    logger.error("Error adding room rating:", { error });
    const err = error as Error & { code?: number };
    if (err.code === 11000) {
      errorResponse(
        res,
        err,
        "You have already rated this room",
        StatusCodes.CONFLICT,
      );
    } else {
      errorResponse(res, err, "Failed to add rating");
    }
  }
}

/**
 * Delete rating from room
 */
export async function deleteRoomRating(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user._id;
    const ratingId = toSingleParam(req.params.ratingId);

    const rating = await rateModel.findById(ratingId);
    if (!rating) {
      errorResponse(res, null, "Rating not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (
      rating.ratedBy.toString() !== userId.toString() &&
      (authReq.user as { role?: string }).role !== "admin"
    ) {
      errorResponse(
        res,
        null,
        "You can only delete your own ratings",
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    await rating.deleteOne();
    successResponse(res, null, "Rating deleted successfully");
  } catch (error) {
    logger.error("Error deleting room rating:", { error });
    errorResponse(res, error, "Failed to delete rating");
  }
}

/**
 * Get popular/trending rooms by booking count
 */
export async function getPopularRooms(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit), 10) || 10, 1),
      50,
    );

    const rooms = await bookingModel.aggregate([
      {
        $group: {
          _id: "$room",
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { bookingCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      {
        $project: {
          _id: "$room._id",
          title: "$room.title",
          hotel: "$room.hotel",
          price: "$room.price",
          maxPeople: "$room.maxPeople",
          images: "$room.images",
          isAvailable: "$room.isAvailable",
          bookingCount: 1,
        },
      },
    ]);

    successResponse(res, rooms, "Popular rooms fetched successfully");
  } catch (error) {
    logger.error("Error fetching popular rooms:", { error });
    errorResponse(res, error, "Failed to fetch popular rooms");
  }
}

/**
 * Get newest rooms
 */
export async function getNewRooms(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit), 10) || 10, 1),
      50,
    );

    const rooms = await roomModel
      .find({ isAvailable: true })
      .populate("hotel", "name city address")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    successResponse(res, rooms, "New rooms fetched successfully");
  } catch (error) {
    logger.error("Error fetching new rooms:", { error });
    errorResponse(res, error, "Failed to fetch new rooms");
  }
}

/**
 * Get room recommendations for user
 */
export async function getRecommendedRooms(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user._id;
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit), 10) || 10, 1),
      50,
    );

    const previousBookings = await bookingModel
      .find({ user: userId })
      .populate("room", "hotel amenities")
      .lean();

    const seenRoomIds = new Set<string>();
    const preferredHotels = new Set<string>();
    const preferredAmenities = new Set<string>();

    for (const booking of previousBookings) {
      const room = booking.room as {
        _id?: Types.ObjectId;
        hotel?: Types.ObjectId;
        amenities?: string[];
      };
      if (room?._id) {
        seenRoomIds.add(room._id.toString());
      }
      if (room?.hotel) {
        preferredHotels.add(room.hotel.toString());
      }
      if (room?.amenities?.length) {
        for (const amenity of room.amenities) {
          preferredAmenities.add(amenity);
        }
      }
    }

    const preferenceOr: Record<string, unknown>[] = [];
    if (preferredHotels.size > 0) {
      preferenceOr.push({
        hotel: {
          $in: Array.from(preferredHotels).map((id) => new Types.ObjectId(id)),
        },
      });
    }
    if (preferredAmenities.size > 0) {
      preferenceOr.push({ amenities: { $in: Array.from(preferredAmenities) } });
    }

    let recommendations = await roomModel
      .find({
        _id: {
          $nin: Array.from(seenRoomIds).map((id) => new Types.ObjectId(id)),
        },
        isAvailable: true,
        ...(preferenceOr.length > 0 ? { $or: preferenceOr } : {}),
      })
      .populate("hotel", "name city")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (recommendations.length < limit) {
      const remainingCount = limit - recommendations.length;
      const excludeIds = [
        ...Array.from(seenRoomIds),
        ...recommendations.map((room) => room._id.toString()),
      ].map((id) => new Types.ObjectId(id));

      const fallback = await roomModel
        .find({
          _id: { $nin: excludeIds },
          isAvailable: true,
        })
        .populate("hotel", "name city")
        .sort({ createdAt: -1 })
        .limit(remainingCount)
        .lean();

      recommendations = recommendations.concat(fallback);
    }

    successResponse(
      res,
      recommendations,
      "Recommended rooms fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching recommended rooms:", { error });
    errorResponse(res, error, "Failed to fetch recommended rooms");
  }
}
