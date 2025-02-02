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
        role: cargos[user.rolePosition],
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
      role: cargos[roles["membro"]],
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
  const token = req.cookies.token;
  const { password, email } = req.body;

  if (!token) {
    return res.status(401).json({
      message: "Não autorizado. Token não encontrado.",
      success: false,
    });
  }

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email e senha são obrigatórios.", success: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const loggedUser = await User.findById(decoded.id);

    if (!loggedUser) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
        success: false,
      });
    }

    // Corrected Permission Check:  Allow pastor and above to change passwords
    if (loggedUser.rolePosition !== 0) {
      // Or adjust as needed
      return res
        .status(403)
        .json({ message: "Usuário sem permissão.", success: false });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(404) // Consistent with setRole
        .json({ message: "Usuário não encontrado.", success: false });
    }

    const newPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { password: newPassword } }
    );

    return res
      .status(200)
      .json({ message: "Senha atualizada com sucesso.", success: true });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({
      // Added return
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
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
    if (loggedUser.rolePosition === 0)
      return res
        .status(403)
        .json({ message: "Usuário sem permissão.", success: false });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
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
    console.error(error);
    return res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
  }
};

export const sendReport = async (req, res) => {
  const { name, email, description } = req.body;
  const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN }); // Use environment variable!

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Erro</title>
        <style>
          body {
            font-family: sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          h1 {
            color: #007bff;
          }
          .field {
            margin-bottom: 10px;
          }
          .label {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Novo Relatório de Erro</h1>
          <div class="field">
            <span class="label">Nome:</span> ${name}
          </div>
          <div class="field">
            <span class="label">Email:</span> ${email}
          </div>
          <div class="field">
            <span class="label">Descrição:</span><br>
            <p>${description.replace(/\n/g, "<br>")}</p> </div>
        </div>
      </body>
      </html>
    `;

    await client.send({
      from: {
        name: "Avodah | Error Report",
        email: "mailtrap@demomailtrap.com",
      },
      to: [{ email: "luizz.developer@gmail.com" }],
      subject: "Novo Relatório de Erro!",
      html: htmlContent,
      text: `Name: ${name}\nEmail: ${email}\nDescription: ${description}`,
    });

    res.status(200).send({ message: "Email enviado com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
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

export const setProfilePicture = async (req, res) => {
  try {
    const { user, picture } = req.body;
    const existingUser = await User.findOne({ email: user.email });
    if (!existingUser)
      return res.status(404).json({ message: "Usuário não encontrado." });

    await User.updateOne({ email: user.email }, { profilePicture: picture });
    res.json({
      message: "Foto de perfil atualizada com sucesso.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Erro interno no servidor.",
        success: false,
        error: error.message,
      });
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
    const response = await fetch("https://bolls.life/get-random-verse/NVIPT", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      return res.status(400).json({
        message: "Failed to generate verse.",
        success: false,
        data: null,
      });
    }
    const data = await response.json();
    if (!data.pk) {
      return res.status(400).json({
        message: "Failed to generate verse.",
        success: false,
        data: null,
      });
    }
    return res.status(200).json({ data: data, success: true });
  } catch (error) {
    res.status(500).json({
      message: "Erro interno no servidor.",
      success: false,
      error: error.message,
    });
    console.log(error);
  }
};
