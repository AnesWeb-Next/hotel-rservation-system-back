import { Types } from "mongoose";
import { BaseDocument } from "../common.js";

export interface RoomPrice {
  base: number;
  discount?: number;
}

export interface RoomNumber {
  number: number;
  unavailableDates?: Date[];
}

export interface IRoom extends BaseDocument {
  title: string;
  hotel: Types.ObjectId;
  price: RoomPrice;
  maxPeople: number;
  description: string;
  roomNumbers: RoomNumber[];
  amenities?: string[];
  images?: string[];
  isAvailable: boolean;
  createdBy?: Types.ObjectId;
}
