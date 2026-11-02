import z from "zod/v4";
import { mongoIdSchema } from "./utils.js";

export const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

export const roomRatingParamsSchema = z.object({
  id: mongoIdSchema,
  ratingId: mongoIdSchema,
});

export const adminRatingsQuerySchema = z.object({
  page: z
    .string()
    .default("1")
    .transform(Number)
    .pipe(z.number().int().min(1, "Page must be a positive integer")),
  limit: z
    .string()
    .default("10")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100, "Limit cannot exceed 100")),
});

export type AdminRatingsQuery = z.infer<typeof adminRatingsQuerySchema>;
