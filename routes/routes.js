import express from "express";
import {
  isLogged,
  login,
  register,
  logout,
  setPassword,
  setRole,
  sendReport,
  sendPost,
  getAllPosts,
  getUserInfo,
  getPost,
  removePost,
  generateVerse,
  setProfilePicture,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/change-picture", setProfilePicture);
router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.post("/set-password", setPassword);
router.post("/set-role", setRole);
router.post("/send-report", sendReport);

router.post("/posts", sendPost);
router.post("/posts/remove/:postId", removePost);
router.get("/posts", getAllPosts);
router.get("/posts/:postId", getPost);
router.get("/generateVerse", generateVerse);

router.get("/getUser", getUserInfo);
router.get("/isLogged", isLogged);

export default router;
