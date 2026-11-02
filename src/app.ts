import express from "express";
import authRouter from "./routers/auth.js";
import bookingRouter from "./routers/booking.js";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { StatusCodes } from "http-status-codes";
import { errorHandler } from "./middleware/errorHandler.js";
import roomRouter from "./routers/room.js";
import hotelRouter from "./routers/hotel.js";
import adminRouter from "./routers/admin.js";

const app = express();

// middlewares
app.use(helmet());
const allowedOrigins = (
  process.env.FRONTEND_DOMAIN ||
  "http://localhost:3000,http://localhost:3001,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`Cors: origin ${origin} not allowed`));
    },
  }),
);
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/bookings", bookingRouter);
app.use("/room", roomRouter);
app.use("/hotel", hotelRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Not Found
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

//  Error handling
app.use(errorHandler);

export default app;
