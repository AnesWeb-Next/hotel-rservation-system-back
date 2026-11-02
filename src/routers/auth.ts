import { Router } from "express";
import {
  register,
  login,
  checkUser,
  updateProfile,
  changePassword,
} from "../handlers/auth.js";
import { validateBodySchema } from "../middleware/validations.js";
import { CheckAuth } from "../middleware/auth.js";
import {
  changePasswordSchema,
  loginSchema,
  profileUpdateSchema,
  userSchema,
} from "../validation/user.js";

const authRouter = Router();

authRouter.post("/login", validateBodySchema(loginSchema), login);

authRouter.post("/register", validateBodySchema(userSchema), register);

authRouter.get("/check", CheckAuth, checkUser);
authRouter.put(
  "/profile",
  CheckAuth,
  validateBodySchema(profileUpdateSchema),
  updateProfile,
);
authRouter.put(
  "/change-password",
  CheckAuth,
  validateBodySchema(changePasswordSchema),
  changePassword,
);

export default authRouter;
