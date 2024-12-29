import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    rolePosition: { type: Number, required: true },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
