import { z } from "zod/v4";
import { mongoIdSchema } from "./utils.js";

/**
 * Room schema
 * Validates room creation and update data
 */
export const roomSchema = z
  .object({
    title: z.string().min(1, "Room title is required"),

    hotel: mongoIdSchema,

    price: z.object({
      base: z.number().min(0, "Base price must be positive"),
      discount: z.number().min(0, "Discount must be positive").optional(),
    }),

    maxPeople: z.number().int().min(1, "Max people must be at least 1"),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters long"),

    roomNumbers: z
      .array(
        z.object({
          number: z.number().int().min(1, "Room number must be positive"),

          unavailableDates: z.array(z.coerce.date()).optional(),
        }),
      )
      .min(1, "At least one room number is required"),

    amenities: z.array(z.string()).optional(),

    images: z.array(z.url("Image must be a valid URL")).optional(),

    isAvailable: z.boolean().optional(),

    createdBy: mongoIdSchema.optional(),
  })
  .refine(
    (data) => {
      // discount <= base
      if (data.price.discount !== undefined) {
        return data.price.discount <= data.price.base;
      }
      return true;
    },
    {
      message: "Discount cannot be greater than base price",
      path: ["price", "discount"],
    },
  )
  .refine(
    (data) => {
      const numbers = data.roomNumbers.map((r) => r.number);
      return new Set(numbers).size === numbers.length;
    },
    {
      message: "Room numbers must be unique",
      path: ["roomNumbers"],
    },
  );

// =========================
// 🔍 Query Schema
// =========================

export const roomQuerySchema = z.object({
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

  sortBy: z
    .enum(["createdAt", "price.base", "maxPeople"])
    .optional()
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .transform((val) => (val === "asc" ? 1 : -1) as 1 | -1),

  search: z.string().optional(),

  hotel: mongoIdSchema.optional(),

  minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),

  maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),

  maxPeople: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1))
    .optional(),

  isAvailable: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

// =========================
// 📌 Params Schema
// =========================

export const roomParamsSchema = z.object({
  id: mongoIdSchema,
});

export type RoomQuery = z.infer<typeof roomQuerySchema>;
