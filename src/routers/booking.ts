import { Router } from "express";
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from "../middleware/validations.js";
import { CheckAuth, isAdmin } from "../middleware/auth.js";
import {
  bookingParamsSchema,
  bookingQuerySchema,
  createBookingBodySchema,
  extendStayBodySchema,
  rejectBookingBodySchema,
  userBookingQuerySchema,
} from "../validation/booking.js";
import {
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  confirmBooking,
  createBooking,
  extendStay,
  getBookingById,
  getBookings,
  getPastDueCheckouts,
  getUserBookings,
  rejectBooking,
} from "../handlers/booking.js";

const bookingRouter = Router();

// --- Static paths first (before "/:id") ---

bookingRouter.get(
  "/past-due-checkouts",
  CheckAuth,
  isAdmin,
  getPastDueCheckouts,
);

bookingRouter.get(
  "/me",
  CheckAuth,
  validateQuerySchema(userBookingQuerySchema),
  getUserBookings,
);

bookingRouter.get(
  "/",
  CheckAuth,
  isAdmin,
  validateQuerySchema(bookingQuerySchema),
  getBookings,
);

bookingRouter.post(
  "/",
  CheckAuth,
  validateBodySchema(createBookingBodySchema),
  createBooking,
);

// --- By id ---

bookingRouter.get(
  "/:id",
  CheckAuth,
  validateParamsSchema(bookingParamsSchema),
  getBookingById,
);

bookingRouter.patch(
  "/:id/confirm",
  CheckAuth,
  isAdmin,
  validateParamsSchema(bookingParamsSchema),
  confirmBooking,
);

bookingRouter.patch(
  "/:id/reject",
  CheckAuth,
  isAdmin,
  validateParamsSchema(bookingParamsSchema),
  validateBodySchema(rejectBookingBodySchema),
  rejectBooking,
);

bookingRouter.patch(
  "/:id/check-in",
  CheckAuth,
  isAdmin,
  validateParamsSchema(bookingParamsSchema),
  checkInBooking,
);

bookingRouter.patch(
  "/:id/check-out",
  CheckAuth,
  validateParamsSchema(bookingParamsSchema),
  checkOutBooking,
);

bookingRouter.patch(
  "/:id/cancel",
  CheckAuth,
  validateParamsSchema(bookingParamsSchema),
  cancelBooking,
);

bookingRouter.patch(
  "/:id/extend",
  CheckAuth,
  validateParamsSchema(bookingParamsSchema),
  validateBodySchema(extendStayBodySchema),
  extendStay,
);

export default bookingRouter;
