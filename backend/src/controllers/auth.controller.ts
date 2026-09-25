import { Request, Response } from "express";
import { prisma } from "../config/db";
import { env } from "../config/env";
import {
  AuthError,
  loginWithGoogle,
  loginWithPassword,
  publicUser,
  registerWithPassword
} from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

function setSessionCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    const { user, token } = await loginWithGoogle(credential);
    setSessionCookie(res, token);

    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Google login failed", error);
    return res.status(401).json({ error: "Google login failed" });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body ?? {};
    const { user, token } = await registerWithPassword(String(name ?? ""), String(email ?? ""), String(password ?? ""));
    setSessionCookie(res, token);

    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error instanceof AuthError) return res.status(error.status).json({ error: error.message });
    console.error("Registration failed", error);
    return res.status(500).json({ error: "Unable to create account" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};
    const { user, token } = await loginWithPassword(String(email ?? ""), String(password ?? ""));
    setSessionCookie(res, token);

    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (error instanceof AuthError) return res.status(error.status).json({ error: error.message });
    console.error("Login failed", error);
    return res.status(500).json({ error: "Unable to log in" });
  }
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true, avatar: true }
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  return res.json({ ok: true });
}
