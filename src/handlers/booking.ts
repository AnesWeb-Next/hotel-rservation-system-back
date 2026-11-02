import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import bookingModel from "../models/booking.js";

import type {
  AuthenticatedRequest,
  RequestWithParsedQuery,
} from "../types/express.js";
import type { BookingStatus } from "../types/common.js";
import type {
  BookingQuery,
  CreateBookingBody,
  ExtendStayBody,
  RejectBookingBody,
  UserBookingQuery,
} from "../validation/booking.js";
import { logger } from "../utils/logger.js";
import { addDays } from "../utils/dateHelpers.js";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "../utils/responseFormatter.js";
import roomModel from "../models/room.js";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed", "checked_in"];

const SORTABLE_BOOKING_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "checkInDate",
  "checkOutDate",
  "status",
  "totalPrice",
]);

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const checkInMs = new Date(checkIn).getTime();
  const checkOutMs = new Date(checkOut).getTime();
  const diffTime = Math.abs(checkOutMs - checkInMs);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function effectiveNightlyRate(room: {
  price: { base: number; discount?: number };
}): number {
  const discount = room.price.discount ?? 0;
  return Math.max(0, room.price.base - discount);
}

export async function getBookings(req: Request, res: Response): Promise<void> {
  try {
    const parsedReq = req as unknown as RequestWithParsedQuery<BookingQuery>;
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = -1,
      status,
    } = parsedReq.parsedQuery;

    const safeSortBy = SORTABLE_BOOKING_FIELDS.has(sortBy)
      ? sortBy
      : "createdAt";
    const { user, room } = parsedReq.parsedQuery;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (user) filter.user = user;
    if (room) filter.room = room;

    const [bookings, total] = await Promise.all([
      bookingModel
        .find(filter)
        .populate("user", "fullName displayName email avatar")
        .populate("room", "title hotel price maxPeople images")
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ [safeSortBy]: sortOrder })
        .lean(),
      bookingModel.countDocuments(filter),
    ]);

    paginatedResponse(
      res,
      bookings,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      "Bookings fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching bookings:", { error });
    errorResponse(res, error, "Failed to fetch bookings");
  }
}

export async function getUserBookings(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user._id;
    const parsedReq =
      req as unknown as RequestWithParsedQuery<UserBookingQuery>;
    const { status, limit, page } = parsedReq.parsedQuery;

    const filter: Record<string, unknown> = { user: userId };
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      bookingModel
        .find(filter)
        .populate({
          path: "room",
          select: "title hotel price maxPeople images description",
          populate: { path: "hotel", select: "name city address" },
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      bookingModel.countDocuments(filter),
    ]);

    paginatedResponse(
      res,
      bookings,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      "Your bookings fetched successfully",
    );
  } catch (error) {
    logger.error("Error fetching user bookings:", { error });
    errorResponse(res, error, "Failed to fetch your bookings");
  }
}

export async function createBooking(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user._id;
    const {
      roomId,
      checkInDate,
      checkOutDate,
      guestsCount,
      guestNames,
      phoneNumber,
      email,
      specialRequests,
      comments,
    } = req.body as CreateBookingBody;

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime()) ||
      checkIn >= checkOut
    ) {
      errorResponse(
        res,
        null,
        "Invalid check-in or check-out dates",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    if (
      typeof guestsCount !== "number" ||
      guestsCount < 1 ||
      guestsCount > 10
    ) {
      errorResponse(
        res,
        null,
        "guestsCount must be between 1 and 10",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const room = await roomModel.findById(roomId);
    if (!room) {
      errorResponse(res, null, "Room not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (!room.isAvailable) {
      errorResponse(
        res,
        null,
        "Room is not available for booking",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    if (guestsCount > room.maxPeople) {
      errorResponse(
        res,
        null,
        `This room allows at most ${room.maxPeople} guest(s)`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const overlapping = await bookingModel.findOne({
      room: roomId,
      status: { $in: ACTIVE_STATUSES },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (overlapping) {
      errorResponse(
        res,
        null,
        "Room is already booked for overlapping dates",
        StatusCodes.CONFLICT,
      );
      return;
    }

    const activeCount = await bookingModel.countDocuments({
      user: userId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (activeCount >= 5) {
      errorResponse(
        res,
        null,
        "You have reached the limit of 5 active bookings",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const nights = nightsBetween(checkIn, checkOut);
    const nightly = effectiveNightlyRate(room);
    const totalPrice = nightly * nights;

    const booking = await bookingModel.create({
      user: userId,
      room: roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      status: "pending",
      guestsCount,
      guestNames: guestNames ?? [],
      totalPrice,
      paidAmount: 0,
      paymentStatus: "pending",
      phoneNumber,
      ...(email ? { email } : {}),
      ...(specialRequests ? { specialRequests } : {}),
      ...(comments ? { comments } : {}),
    });

    const populated = await booking.populate([
      {
        path: "room",
        select: "title hotel price maxPeople images description",
      },
      { path: "user", select: "fullName displayName email" },
    ]);

    successResponse(
      res,
      populated,
      "Booking request submitted successfully",
      StatusCodes.CREATED,
    );
  } catch (error) {
    logger.error("Error creating booking:", { error });
    errorResponse(res, error, "Failed to create booking");
  }
}

export async function confirmBooking(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.params;
    const adminId = authReq.user._id;

    const booking = await bookingModel.findById(id);
    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (booking.status !== "pending") {
      errorResponse(
        res,
        null,
        "Only pending bookings can be confirmed",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    booking.status = "confirmed";
    booking.approvedAt = new Date();
    booking.approvedBy = adminId;
    await booking.save();

    const populated = await booking.populate([
      { path: "room", select: "title hotel price maxPeople images" },
      { path: "user", select: "fullName displayName email" },
    ]);

    successResponse(res, populated, "Booking confirmed");
  } catch (error) {
    logger.error("Error confirming booking:", { error });
    errorResponse(res, error, "Failed to confirm booking");
  }
}

export async function rejectBooking(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body as RejectBookingBody;

    const booking = await bookingModel.findById(id);
    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (booking.status !== "pending") {
      errorResponse(
        res,
        null,
        "Only pending bookings can be rejected",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    if (reason) {
      booking.rejectionReason = reason;
    }
    await booking.save();

    const populated = await booking.populate([
      { path: "room", select: "title hotel price images" },
      { path: "user", select: "fullName displayName email" },
    ]);

    successResponse(res, populated, "Booking rejected");
  } catch (error) {
    logger.error("Error rejecting booking:", { error });
    errorResponse(res, error, "Failed to reject booking");
  }
}

export async function checkInBooking(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    const booking = await bookingModel.findById(id);
    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (booking.status !== "confirmed") {
      errorResponse(
        res,
        null,
        "Only confirmed bookings can be checked in",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    booking.status = "checked_in";
    booking.checkedInAt = new Date();
    await booking.save();

    const populated = await booking.populate([
      { path: "room", select: "title hotel price maxPeople" },
      { path: "user", select: "fullName displayName email" },
    ]);

    successResponse(res, populated, "Guest checked in");
  } catch (error) {
    logger.error("Error checking in booking:", { error });
    errorResponse(res, error, "Failed to check in");
  }
}

export async function checkOutBooking(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;
    const isAdmin = (authReq.user as { role?: string }).role === "admin";

    const booking = await bookingModel.findById(id);
    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (!isAdmin && booking.user.toString() !== userId.toString()) {
      errorResponse(
        res,
        null,
        "You can only check out your own booking",
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    if (booking.status !== "checked_in") {
      errorResponse(
        res,
        null,
        "Only active stays (checked in) can be checked out",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const now = new Date();
    booking.status = "checked_out";
    booking.actualCheckOutDate = now;
    booking.checkedOutAt = now;
    await booking.save();

    const populated = await booking.populate([
      { path: "room", select: "title hotel price images" },
    ]);

    successResponse(res, populated, "Checked out successfully");
  } catch (error) {
    logger.error("Error checking out booking:", { error });
    errorResponse(res, error, "Failed to check out");
  }
}

export async function cancelBooking(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;
    const isAdmin = (authReq.user as { role?: string }).role === "admin";

    const booking = await bookingModel.findById(id);
    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (!isAdmin && booking.user.toString() !== userId.toString()) {
      errorResponse(
        res,
        null,
        "You can only cancel your own bookings",
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    if (booking.status !== "pending" && booking.status !== "confirmed") {
      errorResponse(
        res,
        null,
        "Only pending or confirmed bookings can be cancelled",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    if (!isAdmin) {
      const hoursUntilCheckIn =
        (new Date(booking.checkInDate).getTime() - Date.now()) /
        (1000 * 60 * 60);
      if (hoursUntilCheckIn <= 24) {
        errorResponse(
          res,
          null,
          "Cancellations must be made more than 24 hours before check-in",
          StatusCodes.BAD_REQUEST,
        );
        return;
      }
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();

    successResponse(res, booking, "Booking cancelled");
  } catch (error) {
    logger.error("Error cancelling booking:", { error });
    errorResponse(res, error, "Failed to cancel booking");
  }
}

export async function extendStay(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.params;
    const { additionalDays = 7 } = req.body as ExtendStayBody;
    const cappedDays = additionalDays;
    const userId = authReq.user._id;

    const booking = await bookingModel.findById(id);
    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    if (booking.user.toString() !== userId.toString()) {
      errorResponse(
        res,
        null,
        "You can only extend your own bookings",
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    if (booking.status !== "confirmed" && booking.status !== "checked_in") {
      errorResponse(
        res,
        null,
        "Only confirmed or checked-in stays can be extended",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const now = new Date();
    if (now > new Date(booking.checkOutDate)) {
      errorResponse(
        res,
        null,
        "Cannot extend a stay after the scheduled check-out date",
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    const room = await roomModel.findById(booking.room);
    if (!room) {
      errorResponse(res, null, "Room not found", StatusCodes.NOT_FOUND);
      return;
    }

    const oldCheckOut = new Date(booking.checkOutDate);
    const newCheckOut = addDays(oldCheckOut, cappedDays);

    const conflict = await bookingModel.findOne({
      _id: { $ne: booking._id },
      room: booking.room,
      status: { $in: ACTIVE_STATUSES },
      checkInDate: { $lt: newCheckOut },
      checkOutDate: { $gt: oldCheckOut },
    });

    if (conflict) {
      errorResponse(
        res,
        null,
        "Room is not available for the extended dates",
        StatusCodes.CONFLICT,
      );
      return;
    }

    const nightly = effectiveNightlyRate(room);
    booking.checkOutDate = newCheckOut;
    booking.totalPrice += nightly * cappedDays;
    await booking.save();

    successResponse(
      res,
      {
        checkOutDate: booking.checkOutDate,
        additionalDays: cappedDays,
        totalPrice: booking.totalPrice,
      },
      "Stay extended",
    );
  } catch (error) {
    logger.error("Error extending stay:", { error });
    errorResponse(res, error, "Failed to extend stay");
  }
}

export async function getBookingById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user._id;
    const isAdmin = (authReq.user as { role?: string }).role === "admin";

    const booking = await bookingModel
      .findById(id)
      .populate("room", "title hotel price maxPeople images description")
      .populate("user", "fullName displayName email avatar");

    if (!booking) {
      errorResponse(res, null, "Booking not found", StatusCodes.NOT_FOUND);
      return;
    }

    const bookingUserId =
      (booking.user as { _id?: unknown })._id || booking.user;
    if (!isAdmin && bookingUserId.toString() !== userId.toString()) {
      errorResponse(res, null, "Access denied", StatusCodes.FORBIDDEN);
      return;
    }

    successResponse(res, booking, "Booking fetched successfully");
  } catch (error) {
    logger.error("Error fetching booking by id:", { error });
    errorResponse(res, error, "Failed to fetch booking");
  }
}

export async function getPastDueCheckouts(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const bookings = await bookingModel
      .find({
        status: "checked_in",
        checkOutDate: { $lt: new Date() },
      })
      .populate("user", "fullName displayName email")
      .populate("room", "title hotel price")
      .sort({ checkOutDate: 1 })
      .lean();

    successResponse(res, bookings, "Past-due checkouts fetched successfully");
  } catch (error) {
    logger.error("Error fetching past-due checkouts:", { error });
    errorResponse(res, error, "Failed to fetch past-due checkouts");
  }
}
