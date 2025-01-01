import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { MailtrapClient } from "mailtrap";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import axios from "axios";

dotenv.config({ path: path.resolve(".env") });

const roles = {
  developer: 0,
  pastor: 1,
  vicepastor: 2,
  secretaria: 3,
  membro: 4,
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user)
      return res
        .status(400)
        .json({ message: "Usuário não encontrado.", success: false });
    if (!password)
      return res
        .status(400)
        .json({ message: "Senha não fornecida.", success: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res
        .status(401)
        .json({ message: "Senha inválida.", success: false });
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        rolePosition: user.rolePosition,
      },
      process.env.SECRET_KEY
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({
      message: "Usuário logado com sucesso.",
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        rolePosition: user.rolePosition,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro interno no servidor.", success: false });
  }
};

export const isLogged = async (req, res) => {
  const token = req.cookies.token;
  if (!token)
    return res.status(400).json({ success: false, message: "Not logged in" });
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id);
    res.status(200).json({
      success: true,
      message: "User is authenticated",
      data: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Token inválido ou expirado." });
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
    const usernameExists = await User.findOne({
      username: username.toLowerCase(),
    });
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (usernameExists || emailExists)
      return res
        .status(400)
        .json({ message: "Usuário já existente.", success: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "membro",
      rolePosition: roles["membro"],
    });
    await user.save();
    res
      .status(201)
      .json({
        message: "Usuário criado com sucesso.",
        success: true,
        data: { ...user._doc, password: undefined },
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro interno no servidor.", success: false });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    res
      .status(200)
      .json({ message: "Usuário deslogado com sucesso.", success: true });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao deslogar o usuário.", success: false });
  }
};
