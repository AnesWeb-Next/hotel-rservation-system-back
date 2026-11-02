import { Router } from "express";
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from "../middleware/validations.js";
import { CheckAuth, isAdmin } from "../middleware/auth.js";
import {
  createHotel,
  deleteHotel,
  getHotelById,
  getHotels,
  updateHotel,
} from "../handlers/hotel.js";
import {
  hotelParamsSchema,
  hotelQuerySchema,
  hotelSchema,
} from "../validation/hotel.js";

const hotelRouter = Router();

hotelRouter.get("/", validateQuerySchema(hotelQuerySchema), getHotels);
hotelRouter.get("/:id", validateParamsSchema(hotelParamsSchema), getHotelById);

// admin routes
hotelRouter.post(
  "/",
  CheckAuth,
  isAdmin,
  validateBodySchema(hotelSchema),
  createHotel,
);

hotelRouter.put(
  "/:id",
  CheckAuth,
  isAdmin,
  validateParamsSchema(hotelParamsSchema),
  validateBodySchema(hotelSchema),
  updateHotel,
);

hotelRouter.delete(
  "/:id",
  CheckAuth,
  isAdmin,
  validateParamsSchema(hotelParamsSchema),
  deleteHotel,
);

export default hotelRouter;
