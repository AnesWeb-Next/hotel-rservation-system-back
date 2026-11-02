import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { logger } from "../utils/logger.js";
import { errorResponse } from "../utils/responseFormatter.js";

/**
 * Mongoose error with code property
 */
interface MongooseError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
  path?: string;
  value?: unknown;
}

/*
 * Global error handling middleware
 * Must be placed after all routes
 */

export function errorHandler(
  err: Error | MongooseError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log error
  logger.error("Error occurred", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const mongoErr = err as MongooseError;
    errorResponse(
      res,
      mongoErr.errors
        ? Object.values(mongoErr.errors).map((e) => e.message)
        : err.message,
      "Validation error",
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  // Mongoose duplicate key errors
  const mongoErr = err as MongooseError;
  if (mongoErr.code === 11000) {
    const field = mongoErr.keyPattern
      ? Object.keys(mongoErr.keyPattern)[0]
      : "field";
    errorResponse(
      res,
      null,
      `Duplicate value for ${field}`,
      StatusCodes.CONFLICT,
    );
    return;
  }

  // Mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    errorResponse(
      res,
      null,
      `Invalid ${mongoErr.path}: ${mongoErr.value}`,
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    errorResponse(res, null, "Invalid token", StatusCodes.UNAUTHORIZED);
    return;
  }

  if (err.name === "TokenExpiredError") {
    errorResponse(res, null, "Token expired", StatusCodes.UNAUTHORIZED);
    return;
  }

  // Default to 500 server error
  errorResponse(
    res,
    process.env.NODE_ENV === "development" ? err.stack : undefined,
    process.env.NODE_ENV === "development"
      ? err.message
      : "Internal server error",
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
}
