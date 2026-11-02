import z from "zod/v4";
import { mongoIdSchema } from "./utils.js";

export const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

export const roomRatingParamsSchema = z.object({
  id: mongoIdSchema,
  ratingId: mongoIdSchema,
});
