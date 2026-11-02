import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import hotelModel from "../models/hotel.js";
import roomModel from "../models/room.js";
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from "../utils/responseFormatter.js";
import { logger } from "../utils/logger.js";
import type { RequestWithParsedQuery } from "../types/express.js";
import type { HotelQuery } from "../validation/hotel.js";

const SORTABLE_HOTEL_FIELDS = new Set(["createdAt", "name", "city"]);

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
 * Create new hotel
 */
export async function createHotel(req: Request, res: Response): Promise<void> {
  try {
    const hotel = await hotelModel.create(req.body);
    const populatedHotel = await hotel.populate(
      "createdBy",
      "fullName displayName email avatar",
    );

    successResponse(
      res,
      populatedHotel,
      "Hotel created successfully",
      StatusCodes.CREATED,
    );
  } catch (error) {
    logger.error("Error creating hotel:", { error });
    const err = error as Error;
    if (isDuplicateKeyError(error)) {
      errorResponse(
        res,
        err,
        "A hotel with this data already exists",
        StatusCodes.CONFLICT,
      );
      return;
    }
    errorResponse(res, err, "Failed to create hotel", StatusCodes.BAD_REQUEST);
  }
}

/**
 * Get all hotels with filters
 */
export async function getHotels(req: Request, res: Response): Promise<void> {
  try {
    const parsedReq = req as unknown as RequestWithParsedQuery<HotelQuery>;
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = -1,
      search,
      city,
      type,
      featured,
    } = parsedReq.parsedQuery;

    const safeSortBy = SORTABLE_HOTEL_FIELDS.has(sortBy) ? sortBy : "createdAt";
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$text = { $search: search };
    }
    if (city) {
      filter.city = city;
    }
    if (type) {
      filter.type = type;
    }
    if (featured !== undefined) {
      filter.featured = featured;
    }

    const [hotels, total] = await Promise.all([
      hotelModel
        .find(filter)
        .populate("createdBy", "fullName displayName email avatar")
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ [safeSortBy]: sortOrder })
        .lean(),
      hotelModel.countDocuments(filter),
    ]);

    paginatedResponse(
      res,
      hotels,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      "Hotels fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching hotels:", { error });
    errorResponse(res, error, "Failed to fetch hotels");
  }
}

/**
 * Get one hotel
 */
export async function getHotelById(req: Request, res: Response): Promise<void> {
  const id = toSingleParam(req.params.id);
  try {
    const hotel = await hotelModel
      .findById(id)
      .populate("createdBy", "fullName displayName email avatar");

    if (!hotel) {
      errorResponse(res, null, "Hotel not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, hotel, "Hotel fetched successfully");
  } catch (error) {
    logger.error("Error fetching hotel:", { error });
    if (isCastError(error)) {
      errorResponse(
        res,
        error,
        `Invalid hotel id: ${id}`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }
    errorResponse(res, error, `Failed to fetch hotel ${id}`);
  }
}

/**
 * Update hotel
 */
export async function updateHotel(req: Request, res: Response): Promise<void> {
  const id = toSingleParam(req.params.id);
  try {
    const hotel = await hotelModel
      .findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true })
      .populate("createdBy", "fullName displayName email avatar");

    if (!hotel) {
      errorResponse(res, null, "Hotel not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, hotel, "Hotel updated successfully");
  } catch (error) {
    logger.error("Error updating hotel:", { error });
    if (isDuplicateKeyError(error)) {
      errorResponse(
        res,
        error,
        "Update conflicts with an existing unique value",
        StatusCodes.CONFLICT,
      );
      return;
    }
    if (isCastError(error)) {
      errorResponse(
        res,
        error,
        `Invalid hotel id: ${id}`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }
    errorResponse(res, error, `Failed to update hotel ${id}`);
  }
}

/**
 * Delete hotel (blocked if rooms exist)
 */
export async function deleteHotel(req: Request, res: Response): Promise<void> {
  const id = toSingleParam(req.params.id);
  try {
    const roomCount = await roomModel.countDocuments({
      hotel: new Types.ObjectId(id),
    });

    if (roomCount > 0) {
      errorResponse(
        res,
        null,
        `Cannot delete hotel with ${roomCount} room(s). Delete/move rooms first.`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const hotel = await hotelModel.findByIdAndDelete(id);
    if (!hotel) {
      errorResponse(res, null, "Hotel not found", StatusCodes.NOT_FOUND);
      return;
    }

    successResponse(res, null, "Hotel deleted successfully");
  } catch (error) {
    logger.error("Error deleting hotel:", { error });
    if (isCastError(error)) {
      errorResponse(
        res,
        error,
        `Invalid hotel id: ${id}`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }
    errorResponse(res, error, `Failed to delete hotel ${id}`);
  }
}
