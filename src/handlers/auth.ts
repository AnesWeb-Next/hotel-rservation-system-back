import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";
import { AuthenticatedRequest } from "../types/express.js";
import { errorResponse, successResponse } from "../utils/responseFormatter.js";

export async function register(req: Request, res: Response) {
  const user = req.body;

  try {
    const createUser = await userModel.create(user);

    const userInfo = {
      _id: createUser._id.toString(),
      createdAt: new Date(),
    };

    const token = jwt.sign(userInfo, process.env.AUTH_SECRET as string);

    const userObject = createUser.toObject();
    const { password: _pwd, ...safeUser } = userObject;

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "You have registered successfully !",
      data: safeUser,
      token,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Failed to register",
      error,
    });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email: email });
    if (!user) throw new Error("Wrong email/password");

    const isPswCorrect = await user.comparePassword(password);
    if (!isPswCorrect) throw new Error("Wrong email/password");

    const userInfo = {
      _id: user._id.toString(),
      createdAt: new Date(),
    };

    const token = jwt.sign(userInfo, process.env.AUTH_SECRET as string);

    const userObject = user.toObject();
    const { password: _pwd, ...safeUser } = userObject;

    res.status(StatusCodes.OK).json({
      success: true,
      message: "You have logged in successfully!",
      data: safeUser,
      token,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred";
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Failed to login",
      error: errorMessage,
    });
  }
}

export async function checkUser(req: Request, res: Response): Promise<void> {
  const authReq = req as unknown as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) throw new Error("User not found");

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User is Authenticated",
    data: user,
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as unknown as AuthenticatedRequest;
  const user = await userModel
    .findByIdAndUpdate(authReq.user._id, { $set: req.body }, {
      new: true,
      runValidators: true,
    })
    .select("-password");

  if (!user) {
    errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
    return;
  }

  successResponse(res, user, "Profile updated successfully");
}

export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  const authReq = req as unknown as AuthenticatedRequest;
  const user = await userModel.findById(authReq.user._id);

  if (!user) {
    errorResponse(res, null, "User not found", StatusCodes.NOT_FOUND);
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordCorrect) {
    errorResponse(
      res,
      null,
      "Current password is incorrect",
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  user.password = newPassword;
  await user.save();
  successResponse(res, null, "Password changed successfully");
}
