import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/routes.js";
import { connectDB } from "./database/connect.js";

dotenv.config({ path: "../.env" });

const app = express();

const allowedOrigin = [
  "https://frontend-snowy-iota-95.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);

connectDB();

export default app;
