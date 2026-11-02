import { BaseDocument, UserRole } from "../common.js";

export interface IUser extends BaseDocument {
  fullName: string;
  displayName?: string;
  email: string;
  password: string;
  DateOfBirth?: Date;
  gender?: string;
  phone?: number;
  nationality?: string;
  address?: string;
  avatar?: string;
  role: UserRole;
}

export interface IUserDocument extends IUser {
  /** Compare a plain text password with the hashed password */
  comparePassword(requestedPassword: string): Promise<boolean>;
}
