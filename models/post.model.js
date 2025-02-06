import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    authorId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    hearts: { type: Number, default: 0 },
    postId: { type: String, required: true },
    image: { type: String, required: false },
  },
  { timestamps: true }
);

export const Post = mongoose.model("Post", postSchema);
