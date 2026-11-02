import { Types } from "mongoose";
import { type BaseDocument } from "../common.js";

export interface IRating extends BaseDocument {
  ratedBy: Types.ObjectId;
  roomId: Types.ObjectId;
  rating: number;
}
