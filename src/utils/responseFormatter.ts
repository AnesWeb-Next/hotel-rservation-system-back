import { StatusCodes } from "http-status-codes";
import { Response } from "express";
import type {
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "../types/index.js";

export function successResponse<T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = StatusCodes.OK,
): Response<ApiSuccessResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  error: Error | string | unknown,
  message: string = "Error occurred",
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
): Response<ApiErrorResponse> {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : undefined;

  return res.status(statusCode).json({
    success: false,
    message,
    error: errorMessage,
  });
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message: string = "Success",
  statusCode: number = StatusCodes.OK,
): Response<ApiPaginatedResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
}
