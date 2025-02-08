import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { MailtrapClient } from "mailtrap";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

dotenv.config({ path: path.resolve(".env") });

const roles = {
  developer: 0,
  pastor: 1,
  vicepastor: 2,
  secretaria: 3,
  department: 4,
  lider: 5,
  social: 6,
  membro: 7,
};
const cargos = {
  0: "Desenvolvedor",
  1: "Pastor Presidente",
  2: "Pastor Vice-Presidente",
  3: "Secretário/a",
  4: "Líder de Departamento",
  5: "Líder",
  6: "Influenciador",
  7: "Membro",
};

const handleError = (res, error) => {
  console.error(error);
  res
    .status(500)
    .json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (
      !user ||
      !password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: !user ? "Usuário não encontrado." : "Senha inválida.",
        success: false,
      });
    }
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        rolePosition: user.rolePosition,
      },
      process.env.SECRET_KEY,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
      domain: process.env.COOKIE_DOMAIN || "yourdomain.com",
    });
    res
      .status(200)
      .json({
        message: "Usuário logado com sucesso.",
        success: true,
        token,
        data: {
          ...user._doc,
          password: undefined,
          role: cargos[user.rolePosition],
        },
      });
  } catch (error) {
    handleError(res, error);
  }
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password)
      return res
        .status(400)
        .json({
          message: "Todos os campos devem ser preenchidos.",
          success: false,
        });
    if (
      await User.findOne({
        $or: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() },
        ],
      })
    )
      return res
        .status(400)
        .json({ message: "Usuário já existente.", success: false });
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: cargos[roles["membro"]],
      rolePosition: roles["membro"],
    });
    res
      .status(201)
      .json({
        message: "Usuário criado com sucesso.",
        success: true,
        data: { ...user._doc, password: undefined },
      });
  } catch (error) {
    handleError(res, error);
  }
};

export const isLogged = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id);
    res
      .status(200)
      .json({
        message: "Usuário autenticado com sucesso.",
        success: true,
        data: { ...user._doc, password: undefined },
      });
  } catch (error) {
    res
      .status(401)
      .json({ message: "Token inválido ou expirado.", success: false });
  }
};

export const sendPost = async (req, res) => {
  const { title, content, author, authorId } = req.body;
  if (!title || !content || !author || !authorId)
    return res
      .status(400)
      .json({ message: "Dados incompletos.", success: false });
  try {
    const newPost = await Post.create({
      title,
      content,
      author,
      authorId,
      postId: uuidv4(),
    });
    res.status(201).json(newPost);
  } catch (error) {
    handleError(res, error);
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    handleError(res, error);
  }
};

export const removePost = async (req, res) => {
  try {
    const post = await Post.findOne({ postId: req.params.postId });
    if (!post) return res.status(404).json({ message: "Post not found" });
    await Post.deleteOne({ postId: req.params.postId });
    res.status(200).json({ message: "Post deleted successfully", ok: true });
  } catch (error) {
    handleError(res, error);
  }
};

export const generateVerse = async (req, res) => {
  try {
    const response = await fetch("https://bolls.life/get-random-verse/NVIPT", {
      method: "GET",
      credentials: "include",
    });
    const responseBody = await response.json();
    if (!response.ok || !responseBody.pk)
      return res
        .status(400)
        .json({
          message: "Failed to generate verse.",
          success: false,
          data: null,
        });
    res.status(200).json({ data: responseBody, success: true });
  } catch (error) {
    handleError(res, error);
  }
};
