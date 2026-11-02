import { Types } from "mongoose";
import { BookingStatus, PaymentStatus } from "../common.js";

export interface IBooking {
  user: Types.ObjectId;
  room: Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  actualCheckOutDate?: Date;
  status: BookingStatus;
  guestsCount: number;
  guestNames?: string[];
  totalPrice: number;
  paidAmount?: number;
  paymentStatus: PaymentStatus;
  phoneNumber: string;
  email?: string;
  specialRequests?: string;
  comments?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  rejectionReason?: string;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingWithVirtuals extends IBooking {
  nightsCount: number;
  canCancel: boolean;
  isRefundable: boolean;
  remainingBalance: number;
}
