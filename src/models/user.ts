import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IUserDocument } from "../types/models/user.js";

const userSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    DateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "non-binary", "prefer-not-to-say"],
      default: "",
    },

    phone: String,
    nationality: String,
    address: String,
    avatar: String,

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
    },
  },
);

userSchema.pre("save", async function () {
  if (this.isNew || this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = async function (
  requestedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(requestedPassword, this.password);
};

const userModel = model<IUserDocument>("user", userSchema);
export default userModel;
