import { z } from "zod/v4";
import { mongoIdSchema } from "./utils.js";

/** Must match `models/booking.ts` and `types/common.ts` */
export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]);

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export const createBookingBodySchema = z
  .object({
    roomId: mongoIdSchema,
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    guestsCount: z.coerce.number().int().min(1).max(10),
    guestNames: z
      .array(z.string().trim().min(1).max(120))
      .max(10)
      .optional(),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .max(32),
    email: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z.email().trim().toLowerCase().optional(),
    ),
    specialRequests: z.string().trim().max(2000).optional(),
    comments: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.checkInDate < data.checkOutDate, {
    message: "Check-out must be after check-in",
    path: ["checkOutDate"],
  });

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export const rejectBookingBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export type RejectBookingBody = z.infer<typeof rejectBookingBodySchema>;

export const extendStayBodySchema = z.object({
  additionalDays: z.coerce.number().int().min(1).max(30).optional(),
});

export type ExtendStayBody = z.infer<typeof extendStayBodySchema>;

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export const bookingQuerySchema = z.object({
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
    .enum([
      "createdAt",
      "updatedAt",
      "checkInDate",
      "checkOutDate",
      "status",
      "totalPrice",
    ])
    .optional()
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .transform((val) => (val === "asc" ? 1 : -1) as 1 | -1),

  status: bookingStatusSchema.optional(),

  user: mongoIdSchema.optional(),

  room: mongoIdSchema.optional(),
});

export type BookingQuery = z.infer<typeof bookingQuerySchema>;

export const userBookingQuerySchema = z.object({
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
        .max(50, "Limit cannot exceed 50"),
    ),

  status: bookingStatusSchema.optional(),
});

export type UserBookingQuery = z.infer<typeof userBookingQuerySchema>;

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export const bookingParamsSchema = z.object({
  id: mongoIdSchema,
});

export type BookingParams = z.infer<typeof bookingParamsSchema>;
