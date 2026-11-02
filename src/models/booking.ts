import { Schema, model, type Model } from "mongoose";
import type { IBookingWithVirtuals } from "../types/models/booking.js";

/**
 * Booking schema definition for hotel reservation system
 */
const bookingSchema = new Schema<IBookingWithVirtuals>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "room",
      required: true,
    },
    // Renamed from borrowDate
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    actualCheckOutDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
      ] as const,
      default: "pending" as const,
    },

    guestsCount: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    guestNames: {
      type: [String],
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "refunded"],
      default: "pending",
    },

    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    specialRequests: {
      type: String,
      trim: true,
    },
    comments: {
      type: String,
      trim: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    approvedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    checkedInAt: {
      type: Date,
    },
    checkedOutAt: {
      type: Date,
    },
  },
  {
    toJSON: {
      versionKey: false,
      virtuals: true,
    },
    toObject: {
      versionKey: false,
      virtuals: true,
    },
    timestamps: true,
  },
);

/**
 * Virtual: Calculate number of nights stayed
 */
bookingSchema.virtual("nightsCount").get(function (
  this: IBookingWithVirtuals,
): number {
  const checkIn = new Date(this.checkInDate);
  const checkOut = new Date(this.checkOutDate);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

bookingSchema.virtual("canCancel").get(function (
  this: IBookingWithVirtuals,
): boolean {
  if (this.status !== "pending" && this.status !== "confirmed") {
    return false;
  }

  const now = new Date();
  const checkIn = new Date(this.checkInDate);
  const hoursUntilCheckIn =
    (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilCheckIn > 24;
});

bookingSchema.virtual("isRefundable").get(function (
  this: IBookingWithVirtuals,
): boolean {
  if (this.status !== "confirmed") {
    return false;
  }

  const now = new Date();
  const checkIn = new Date(this.checkInDate);
  const daysUntilCheckIn =
    (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilCheckIn > 7;
});

bookingSchema.virtual("remainingBalance").get(function (
  this: IBookingWithVirtuals,
): number {
  return Math.max(0, this.totalPrice - (this.paidAmount || 0));
});

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ room: 1, status: 1 });
bookingSchema.index({ status: 1, checkInDate: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ phoneNumber: 1 }); //
bookingSchema.index(
  { room: 1, checkInDate: 1, checkOutDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed", "checked_in"] },
    },
  },
);

const bookingModel: Model<IBookingWithVirtuals> = model<IBookingWithVirtuals>(
  "booking",
  bookingSchema,
);

export default bookingModel;
