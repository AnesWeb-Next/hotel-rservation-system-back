import type { Request } from "express";
import { IUserDocument } from "./models/user.js";

export interface AuthenticatedRequest extends Request {
  /** Authenticated user attached by auth middleware */
  user: IUserDocument;
}

export interface RequestWithParsedQuery<T = unknown> extends Request {
  /** Parsed and validated query parameters */
  parsedQuery: T;
}

export interface FilterQuery {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
  search?: string;
  category?: string;
}
