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
        .status(401)
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
      sameSite: "None",
    });
    res.status(200).json({
      message: "Usuário logado com sucesso.",
      success: true,
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        rolePosition: user.rolePosition,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password)
      return res.status(400).json({
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
    res.status(201).json({
      message: "Usuário criado com sucesso.",
      success: true,
      data: { ...user._doc, password: undefined },
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const isLogged = async (req, res) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ success: false });
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id);
    res.status(200).json({
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

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res
      .status(200)
      .json({ message: "Usuário deslogado com sucesso.", success: true });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const setPassword = async (req, res) => {
  const { password, email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
        .json({ message: "Usuário não encontrado.", success: false });
    const newPassword = await bcrypt.hash(password, 10);
    await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { password: newPassword } }
    );
    res
      .status(200)
      .json({ message: "Senha atualizada com sucesso.", success: true });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const setRole = async (req, res) => {
  const token = req.cookies.token;
  const { role, email } = req.body;
  try {
    if (!token)
      return res
        .status(401)
        .json({ message: "Não autorizado.", success: false });
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const loggedUser = await User.findById(decoded.id);
    if (loggedUser.rolePosition >= 4)
      return res
        .status(403)
        .json({ message: "Usuário sem permissão.", success: false });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(400)
        .json({ message: "Usuário não encontrado.", success: false });
    const normalizedRole = role?.toLowerCase();
    if (!Object.keys(roles).includes(normalizedRole))
      return res
        .status(400)
        .json({ message: "Cargo inválido.", success: false });
    await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { role: normalizedRole, rolePosition: roles[normalizedRole] } }
    );
    return res
      .status(200)
      .json({ message: "Cargo atualizado com sucesso.", success: true });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const sendReport = async (req, res) => {
  const { name, email, description } = req.body;
  const client = new MailtrapClient({
    token: "6a53c66ece2120782e097e5cfb94d353",
  });
  try {
    await client.send({
      from: { name: "Avodah Church", email: "mailtrap@demomailtrap.com" },
      to: [{ email: "luizz.developer@gmail.com" }],
      subject: "New Error Report!",
      text: `Name: ${name}\nEmail: ${email}\nDescription: ${description}`,
    });
    res.status(200).send({ message: "Email sent successfully!" });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const getUserInfo = async (req, res) => {
  const { id } = req.query;
  try {
    const user = await User.findOne({ username: id });
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado." });
    return { ok: true, user: user };
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const sendPost = async (req, res) => {
  const { title, content, author, authorId } = req.body;
  const postId = uuidv4();
  try {
    const newPost = new Post({
      title,
      content,
      author,
      authorId,
      postId,
      image: req.file.path,
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const getPost = async (req, res) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findOne({ postId: postId });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const removePost = async (req, res) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findOne({ postId: postId });
    if (!post) return res.status(404).json({ message: "Post not found" });
    await Post.deleteOne({ postId: postId });
    res.status(200).json({ message: "Post deleted successfully", ok: true });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};

export const generateVerse = async (req, res) => {
  try {
    const response = await axios.get(
      "https://bible-api.com/?random=verse&translation=almeida"
    );
    if (response.status !== 200)
      res.status(400).json({
        message: "Failed to generate verse.",
        success: false,
        data: null,
      });

    return res.status(200).json({ data: response.data, success: true });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};
