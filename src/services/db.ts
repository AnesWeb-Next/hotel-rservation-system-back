import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true);
}

export async function connectDB(): Promise<typeof mongoose> {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI as string,
      {
        dbName: process.env.MONGODB_DB_NAME,
        auth: {
          username: process.env.MONGODB_USERNAME,
          password: process.env.MONGODB_PASSWORD,
        },
      },
    );

    logger.info("MongoDB connected");
    console.log("MongoDB connected");

    return connection;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error("MongoDB connection error", { error: errorMessage });
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
