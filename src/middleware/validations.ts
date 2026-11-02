import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod/v4";
import { prettifyError } from "zod/v4";
import type { RequestWithParsedQuery } from "../types/index.js";

export function validateBodySchema<T>(schema: ZodSchema<T>) {
  return async function (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const parsed = schema.safeParse(req.body);
    if (parsed.success) {
      req.body = parsed.data; // apply transforms (e.g. string → Date)
      next();
    } else {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        error: prettifyError(parsed.error),
      });
    }
  };
}

export function validateQuerySchema<T>(schema: ZodSchema<T>) {
  return async function (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const parsed = schema.safeParse(req.query);
    if (parsed.success) {
      (req as RequestWithParsedQuery).parsedQuery = parsed.data;
      next();
    } else {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        error: prettifyError(parsed.error),
      });
    }
  };
}

export function validateParamsSchema<T>(schema: ZodSchema<T>) {
  return async function (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const parsed = schema.safeParse(req.params);
    if (parsed.success) {
      next();
    } else {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        error: prettifyError(parsed.error),
      });
    }
  };
}
