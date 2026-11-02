import { Router } from "express";
import { CheckAuth, isAdmin } from "../middleware/auth.js";
import {
  exportData,
  getDashboardStats,
  getAdminRatings,
  getRecentActivity,
  getRevenueChart,
  getRoomAlerts,
  getRoomsByHotelStats,
  getTopRooms,
  getUserStats,
} from "../handlers/admin.js";
import { validateQuerySchema } from "../middleware/validations.js";
import { adminRatingsQuerySchema } from "../validation/rating.js";

const adminRouter = Router();

adminRouter.use(CheckAuth, isAdmin);

adminRouter.get("/dashboard", getDashboardStats);
adminRouter.get("/activity", getRecentActivity);
adminRouter.get(
  "/ratings",
  validateQuerySchema(adminRatingsQuerySchema),
  getAdminRatings,
);
adminRouter.get("/chart-revenue", getRevenueChart);
adminRouter.get("/top-room", getTopRooms);
adminRouter.get("/state-user", getUserStats);
adminRouter.get("/alert-room", getRoomAlerts);
adminRouter.get("/hotel-room", getRoomsByHotelStats);
adminRouter.get("/export/:type", exportData);

export default adminRouter;
