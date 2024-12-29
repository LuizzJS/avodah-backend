import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/routes.js";
import { connectDB } from "./database/connect.js";
dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? "https://yourfrontend.com"
    : "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.clear();
  console.log(`[SERVER] Connected successfully: http://localhost:${PORT}`);
  connectDB();
});
