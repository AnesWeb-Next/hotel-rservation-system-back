import { Types } from "mongoose";

export interface BaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "admin" | "user";

/** Booking lifecycle — must match `models/booking.ts` schema enum */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

/** Payment state — must match `models/booking.ts` schema enum */
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";

/**
 * Payment method enum
 */
export type PaymentMethod = "cash_on_delivery";
