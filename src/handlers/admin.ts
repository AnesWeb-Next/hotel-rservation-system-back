import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import userModel from "../models/user.js";
import roomModel from "../models/room.js";
import bookingModel from "../models/booking.js";
import rateModel from "../models/rating.js";
import { logger } from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/responseFormatter.js";

/**
 * Dashboard statistics (hotel)
 */
export interface DashboardStats {
  users: {
    total: number;
    admins: number;
    guests: number;
    newThisMonth: number;
  };
  rooms: {
    total: number;
    available: number;
    unavailable: number;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    checkedOut: number;
    cancelled: number;
    noShow: number;
    pastDueCheckout: number;
    revenue: number;
    revenueThisMonth: number;
  };
  ratings: {
    total: number;
    average: number;
  };
}

/**
 * Get dashboard statistics (Admin)
 */
export async function getDashboardStats(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      adminUsers,
      guestUsers,
      newUsersThisMonth,
      totalRooms,
      availableRooms,
      unavailableRooms,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      checkedInBookings,
      checkedOutBookings,
      cancelledBookings,
      noShowBookings,
      pastDueCheckoutBookings,
      revenueAgg,
      revenueThisMonthAgg,
      totalRatings,
      avgRatingAgg,
    ] = await Promise.all([
      userModel.countDocuments(),
      userModel.countDocuments({ role: "admin" }),
      userModel.countDocuments({ role: "user" }),
      userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      roomModel.countDocuments(),
      roomModel.countDocuments({ isAvailable: true }),
      roomModel.countDocuments({ isAvailable: false }),
      bookingModel.countDocuments(),
      bookingModel.countDocuments({ status: "pending" }),
      bookingModel.countDocuments({ status: "confirmed" }),
      bookingModel.countDocuments({ status: "checked_in" }),
      bookingModel.countDocuments({ status: "checked_out" }),
      bookingModel.countDocuments({ status: "cancelled" }),
      bookingModel.countDocuments({ status: "no_show" }),
      bookingModel.countDocuments({
        status: "checked_in",
        checkOutDate: { $lt: now },
      }),
      bookingModel.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
      bookingModel.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
      rateModel.countDocuments(),
      rateModel.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
    ]);

    const stats: DashboardStats = {
      users: {
        total: totalUsers,
        admins: adminUsers,
        guests: guestUsers,
        newThisMonth: newUsersThisMonth,
      },
      rooms: {
        total: totalRooms,
        available: availableRooms,
        unavailable: unavailableRooms,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        checkedIn: checkedInBookings,
        checkedOut: checkedOutBookings,
        cancelled: cancelledBookings,
        noShow: noShowBookings,
        pastDueCheckout: pastDueCheckoutBookings,
        revenue: revenueAgg[0]?.total ?? 0,
        revenueThisMonth: revenueThisMonthAgg[0]?.total ?? 0,
      },
      ratings: {
        total: totalRatings,
        average: avgRatingAgg[0]?.avg
          ? Math.round(avgRatingAgg[0].avg * 10) / 10
          : 0,
      },
    };

    successResponse(res, stats, "Dashboard statistics fetched successfully");
  } catch (error) {
    logger.error("Error fetching dashboard stats:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch dashboard statistics",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Recent activity for admin overview
 */
export async function getRecentActivity(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit), 10) || 10, 1),
      50,
    );

    const [recentBookings, recentUsers, recentRatings] = await Promise.all([
      bookingModel
        .find()
        .populate("user", "fullName displayName email avatar")
        .populate("room", "title hotel price")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      userModel
        .find()
        .select("fullName displayName email role createdAt")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      rateModel
        .find()
        .populate("ratedBy", "fullName displayName email avatar")
        .populate("roomId", "title hotel price")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    successResponse(res, {
      bookings: recentBookings,
      users: recentUsers,
      ratings: recentRatings,
    });
  } catch (error) {
    logger.error("Error fetching recent activity:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch recent activity",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Booking revenue over time (paid amounts), for charts
 */
export async function getRevenueChart(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const period = (req.query.period as string) || "month";

    let dateFormat: string;
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = "%Y-%m-%d";
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFormat = "%Y-%m";
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFormat = "%Y-%m-%d";
        break;
    }

    const revenueData = await bookingModel.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$paidAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          revenue: 1,
          bookings: "$count",
          _id: 0,
        },
      },
    ]);

    successResponse(res, revenueData, "Revenue chart data fetched");
  } catch (error) {
    logger.error("Error fetching revenue chart:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch revenue chart data",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Top rooms by booking volume or by average rating
 */
export async function getTopRooms(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit), 10) || 10, 1),
      50,
    );
    const metric = (req.query.metric as string) || "bookings";

    let topRooms: unknown[];

    if (metric === "ratings") {
      topRooms = await rateModel.aggregate([
        {
          $group: {
            _id: "$roomId",
            avgRating: { $avg: "$rating" },
            ratingCount: { $sum: 1 },
          },
        },
        { $match: { ratingCount: { $gt: 0 } } },
        { $sort: { avgRating: -1, ratingCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "rooms",
            localField: "_id",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            roomId: "$_id",
            title: "$room.title",
            hotel: "$room.hotel",
            avgRating: { $round: ["$avgRating", 2] },
            ratingCount: 1,
          },
        },
      ]);
    } else {
      topRooms = await bookingModel.aggregate([
        { $group: { _id: "$room", bookingCount: { $sum: 1 } } },
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
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            roomId: "$_id",
            title: "$room.title",
            hotel: "$room.hotel",
            bookingCount: 1,
          },
        },
      ]);
    }

    successResponse(res, topRooms, "Top rooms fetched");
  } catch (error) {
    logger.error("Error fetching top rooms:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch top rooms",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * User counts by role and signups by month
 */
export async function getUserStats(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const [usersByRole, usersByMonth] = await Promise.all([
      userModel.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      userModel.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]),
    ]);

    successResponse(res, {
      byRole: usersByRole,
      byMonth: usersByMonth,
    });
  } catch (error) {
    logger.error("Error fetching user stats:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch user statistics",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Room counts grouped by hotel (ObjectId — name requires hotel collection)
 */
export async function getRoomsByHotelStats(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const roomsByHotel = await roomModel.aggregate([
      { $group: { _id: "$hotel", roomCount: { $sum: 1 } } },
      { $sort: { roomCount: -1 } },
      {
        $project: {
          hotelId: "$_id",
          roomCount: 1,
          _id: 0,
        },
      },
    ]);

    successResponse(res, roomsByHotel);
  } catch (error) {
    logger.error("Error fetching rooms-by-hotel stats:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch room statistics by hotel",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Operational alerts: unavailable rooms and bookings starting soon
 */
export async function getRoomAlerts(req: Request, res: Response): Promise<void> {
  try {
    const withinHours = Math.min(
      Math.max(parseInt(String(req.query.withinHours), 10) || 48, 1),
      168,
    );
    const soon = new Date(Date.now() + withinHours * 60 * 60 * 1000);

    const [unavailableRooms, upcomingCheckIns] = await Promise.all([
      roomModel
        .find({ isAvailable: false })
        .select("title hotel maxPeople isAvailable createdAt")
        .sort({ updatedAt: -1 })
        .lean(),
      bookingModel
        .find({
          status: { $in: ["pending", "confirmed"] },
          checkInDate: { $gte: new Date(), $lte: soon },
        })
        .populate("user", "fullName displayName email")
        .populate("room", "title hotel")
        .sort({ checkInDate: 1 })
        .lean(),
    ]);

    successResponse(res, {
      unavailableRooms,
      upcomingCheckIns,
      unavailableCount: unavailableRooms.length,
      upcomingCheckInsCount: upcomingCheckIns.length,
    });
  } catch (error) {
    logger.error("Error fetching room alerts:", { error });
    errorResponse(
      res,
      error,
      "Failed to fetch room alerts",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}

const EXPORT_TYPES = ["users", "rooms", "bookings", "ratings"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

function isExportType(t: string): t is ExportType {
  return (EXPORT_TYPES as readonly string[]).includes(t);
}

/**
 * JSON export by resource type (Admin)
 */
export async function exportData(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params as { type: string };

    if (!isExportType(type)) {
      errorResponse(
        res,
        null,
        `Invalid export type. Valid types: ${EXPORT_TYPES.join(", ")}`,
        StatusCodes.BAD_REQUEST,
      );
      return;
    }

    let data: unknown;
    let filename: string;

    switch (type) {
      case "users":
        data = await userModel.find().select("-password").lean();
        filename = "users-export.json";
        break;
      case "rooms":
        data = await roomModel.find().populate("hotel", "name city").lean();
        filename = "rooms-export.json";
        break;
      case "bookings":
        data = await bookingModel
          .find()
          .populate("user", "fullName displayName email")
          .populate("room", "title hotel price")
          .lean();
        filename = "bookings-export.json";
        break;
      case "ratings":
        data = await rateModel
          .find()
          .populate("ratedBy", "fullName displayName email")
          .populate("roomId", "title hotel")
          .lean();
        filename = "ratings-export.json";
        break;
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(StatusCodes.OK).send(JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error("Error exporting data:", { error });
    errorResponse(
      res,
      error,
      "Failed to export data",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}
