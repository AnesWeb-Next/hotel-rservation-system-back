import { Router } from "express";
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from "../middleware/validations.js";

import { CheckAuth, isAdmin } from "../middleware/auth.js";
import { idParamsSchema } from "../validation/utils.js";
import {
  addRoomRating,
  createRoom,
  deleteRoom,
  deleteRoomRating,
  getNewRooms,
  getPopularRooms,
  getRecommendedRooms,
  getRoomById,
  getRoomRatings,
  getRooms,
  updateRoom,
} from "../handlers/room.js";
import { roomQuerySchema, roomSchema } from "../validation/room.js";
import { ratingSchema, roomRatingParamsSchema } from "../validation/rating.js";

const roomRouter = Router();

roomRouter.get("/", validateQuerySchema(roomQuerySchema), getRooms);
roomRouter.get("/popular", getPopularRooms);
roomRouter.get("/new", getNewRooms);
roomRouter.get("/recommended", CheckAuth, getRecommendedRooms);
roomRouter.get("/:id/ratings", validateParamsSchema(idParamsSchema), getRoomRatings);
roomRouter.post(
  "/:id/ratings",
  CheckAuth,
  validateParamsSchema(idParamsSchema),
  validateBodySchema(ratingSchema),
  addRoomRating,
);
roomRouter.delete(
  "/:id/ratings/:ratingId",
  CheckAuth,
  validateParamsSchema(roomRatingParamsSchema),
  deleteRoomRating,
);
roomRouter.get("/:id", validateParamsSchema(idParamsSchema), getRoomById);

// admin routes
roomRouter.post(
  "/",
  CheckAuth,
  isAdmin,
  validateBodySchema(roomSchema),
  createRoom,
);

roomRouter.put(
  "/:id",
  CheckAuth,
  isAdmin,
  validateParamsSchema(idParamsSchema),
  updateRoom,
);

roomRouter.delete(
  "/:id",
  CheckAuth,
  isAdmin,
  validateParamsSchema(idParamsSchema),
  deleteRoom,
);

export default roomRouter;
