import type { BaseDocument } from "../common.js";
import type { Types } from "mongoose";

export interface IHotel extends BaseDocument {
  name: string;
  type: string;
  city: string;
  address: string;
  distance?: string;
  description?: string;
  images?: string[];
  featured: boolean;
  createdBy?: Types.ObjectId;
}
