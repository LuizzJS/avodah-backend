import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./database/connect.js";
import authRoutes from "./routes/routes.js";
import morgan from "morgan";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);

connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});

export default app;
