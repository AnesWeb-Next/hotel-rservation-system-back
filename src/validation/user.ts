import { z } from "zod/v4";

const basicPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const loginSchema = z.object({
  email: z.email("Email must be valid").trim().toLowerCase(),
  password: basicPasswordSchema,
});

export const userSchema = loginSchema.extend({
  fullName: z
    .string()
    .min(3, "Full name must have at least 3 letters")
    .max(140, "Full name must have at most 140 letters"),
  displayName: z
    .string()
    .min(3, "Display name must have at least 3 letters")
    .max(70, "Display name must have at most 70 letters")
    .optional(),
  DateOfBirth: z.iso
    .date()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined)),
  gender: z
    .enum(["male", "female", "non-binary", "prefer-not-to-say"])
    .optional()
    .default("male"),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

export const fullUserSchema = userSchema.extend({
  role: z.enum(["admin", "user"]).optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must have at least 3 letters")
    .max(140, "Full name must have at most 140 letters")
    .optional(),
  displayName: z
    .string()
    .min(3, "Display name must have at least 3 letters")
    .max(70, "Display name must have at most 70 letters")
    .optional(),
  DateOfBirth: z
    .coerce
    .date()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined)),
  gender: z
    .enum(["male", "female", "non-binary", "prefer-not-to-say"])
    .optional(),
  phone: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  avatar: z
    .string()
    .url("Avatar must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: basicPasswordSchema,
});
