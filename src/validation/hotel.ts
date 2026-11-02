import { z } from "zod/v4";
import { mongoIdSchema } from "./utils.js";

export const hotelSchema = z.object({
  name: z.string().trim().min(2, "Hotel name must be at least 2 characters"),
  type: z.string().trim().min(2, "Hotel type is required"),
  city: z.string().trim().min(2, "City is required"),
  address: z.string().trim().min(5, "Address must be at least 5 characters"),
  distance: z.string().trim().optional(),
  description: z.string().trim().max(4000).optional(),
  images: z.array(z.url("Image must be a valid URL")).optional(),
  featured: z.boolean().optional(),
  createdBy: mongoIdSchema.optional(),
});

export const hotelQuerySchema = z.object({
  page: z
    .string()
    .default("1")
    .transform(Number)
    .pipe(z.number().int().min(1, "Page must be a positive integer")),
  limit: z
    .string()
    .default("10")
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be a positive integer")
        .max(100, "Limit cannot exceed 100"),
    ),
  sortBy: z.enum(["createdAt", "name", "city"]).optional().default("createdAt"),
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .transform((val) => (val === "asc" ? 1 : -1) as 1 | -1),
  search: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  featured: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

export const hotelParamsSchema = z.object({
  id: mongoIdSchema,
});

export type HotelQuery = z.infer<typeof hotelQuerySchema>;
