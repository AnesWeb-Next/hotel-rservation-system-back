import { model, Schema } from "mongoose";
import type { IHotel } from "../types/models/hotel.js";

const hotelSchema = new Schema<IHotel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    distance: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    images: [{ type: String }],
    featured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    toJSON: {
      versionKey: false,
    },
    timestamps: true,
  },
);

hotelSchema.index({ name: "text", city: "text", address: "text", type: "text" });
hotelSchema.index({ city: 1 });
hotelSchema.index({ featured: 1 });
hotelSchema.index({ createdAt: -1 });

const hotelModel = model<IHotel>("hotel", hotelSchema);

export default hotelModel;
