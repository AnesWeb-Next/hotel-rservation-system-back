import { Schema, model, type Model } from "mongoose";
import type { IRating } from "../types/models/rating.js";

/**
 * Rating schema definition
 * Defines the structure of rating documents in MongoDB
 */
const rateSchema = new Schema<IRating>(
  {
    ratedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "room",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure one rating per user per room
rateSchema.index({ ratedBy: 1, roomId: 1 }, { unique: true });

const rateModel: Model<IRating> = model<IRating>("rating", rateSchema);

export default rateModel;
