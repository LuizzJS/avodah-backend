import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { MailtrapClient } from "mailtrap";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".env") });

const roles = {
  developer: 0,
  pastor: 1,
  vicepastor: 2,
  secretaria: 3,
  lider: 4,
  social: 5,
  membro: 6,
};
const cargos = {
  0: "Desenvolvedor",
  1: "Pastor Presidente",
  2: "Pastor Vice-Presidente",
  3: "Secretário/a",
  4: "Líder",
  5: "Influenciador",
  6: "Membro",
};

const handleError = (res, error) => {
  console.error(error);
  res.status(500).json({
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
        message: !user
          ? "Usuário não encontrado."
          : !password
          ? "Senha não fornecida."
          : "Senha inválida.",
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
      return res.status(400).json({
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
    res.status(201).json({
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
    handleError(res, error);
  }
};

export const setPassword = async (req, res) => {
  const { password, email } = req.body;
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    const loggedUser = await User.findById(decoded.id);
    if (!loggedUser || loggedUser.rolePosition !== 0)
      return res
        .status(403)
        .json({ message: "Usuário sem permissão.", success: false });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
        .json({ message: "Usuário não encontrado.", success: false });
    await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { password: await bcrypt.hash(password, 10) } }
    );
    res
      .status(200)
      .json({ message: "Senha atualizada com sucesso.", success: true });
  } catch (error) {
    handleError(res, error);
  }
};

export const setRole = async (req, res) => {
  const { role, email } = req.body;
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
    const loggedUser = await User.findById(decoded.id);
    if (!loggedUser || loggedUser.rolePosition !== 0)
      return res
        .status(403)
        .json({ message: "Usuário sem permissão.", success: false });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !Object.keys(roles).includes(role?.toLowerCase()))
      return res.status(404).json({
        message: !user ? "Usuário não encontrado." : "Cargo inválido.",
        success: false,
      });
    await User.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          role: role.toLowerCase(),
          rolePosition: roles[role.toLowerCase()],
        },
      }
    );
    res
      .status(200)
      .json({ message: "Cargo atualizado com sucesso.", success: true });
  } catch (error) {
    handleError(res, error);
  }
};

export const sendReport = async (req, res) => {
  const { name, email, description } = req.body;
  const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });
  try {
    await client.send({
      from: {
        name: "Avodah | Error Report",
        email: "mailtrap@demomailtrap.com",
      },
      to: [{ email: "luizz.developer@gmail.com" }],
      subject: "Novo Relatório de Erro!",
      html: `<div><h1>Novo Relatório de Erro</h1><div><span>Nome:</span> ${name}</div><div><span>Email:</span> ${email}</div><div><span>Descrição:</span><br><p>${description.replace(
        /\n/g,
        "<br>"
      )}</p></div></div>`,
      text: `Name: ${name}\nEmail: ${email}\nDescription: ${description}`,
    });
    res.status(200).send({ message: "Email enviado com sucesso!" });
  } catch (error) {
    handleError(res, error);
  }
};

export const getUserInfo = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.query.id });
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado." });
    res.status(200).json({ ok: true, user });
  } catch (error) {
    handleError(res, error);
  }
};

export const setProfilePicture = async (req, res) => {
  const { user, picture } = req.body;
  try {
    if (
      !user ||
      !user.email ||
      !picture ||
      !/^data:image\/(png|jpg|jpeg|gif|webp);base64,/.test(picture)
    )
      return res
        .status(400)
        .json({ message: "Dados incompletos ou formato de imagem inválido." });
    const existingUser = await User.findOne({ email: user.email.trim() });
    if (!existingUser)
      return res.status(404).json({ message: "Usuário não encontrado." });
    await User.findOneAndUpdate(
      { email: user.email.trim() },
      { profilePicture: picture },
      { new: true }
    );
    res.json({
      message: "Foto de perfil atualizada com sucesso.",
      success: true,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const sendPost = async (req, res) => {
  const { title, content, author, authorId } = req.body;
  try {
    const newPost = await Post.create({
      title,
      content,
      author,
      authorId,
      postId: uuidv4(),
      image: req.file.path,
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

export const getPost = async (req, res) => {
  try {
    const post = await Post.findOne({ postId: req.params.postId });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json(post);
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
    const response = await fetch("https:bolls.life/get-random-verse/NVIPT", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok || !(await response.json()).pk)
      return res.status(400).json({
        message: "Failed to generate verse.",
        success: false,
        data: null,
      });
    res.status(200).json({ data: await response.json(), success: true });
  } catch (error) {
    handleError(res, error);
  }
};
