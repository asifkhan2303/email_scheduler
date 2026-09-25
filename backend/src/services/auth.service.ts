import { OAuth2Client } from "google-auth-library";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../config/env";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const googleClient = new OAuth2Client(env.googleClientId);

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function signSession(userId: string) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function loginWithGoogle(credential: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error("Invalid Google account data");
  }

  const profile = {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatar: payload.picture ?? null
  };

  // Also matches an existing email/password account so it gets linked instead
  // of failing on the unique email constraint.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email: payload.email }] }
  });

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: profile })
    : await prisma.user.create({ data: profile });

  return { user, token: signSession(user.id) };
}

export async function registerWithPassword(name: string, email: string, password: string) {
  if (!name.trim()) throw new AuthError("Name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError("Enter a valid email address");
  if (password.length < 8) throw new AuthError("Password must be at least 8 characters");

  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) throw new AuthError("An account with this email already exists", 409);

  const user = await prisma.user.create({
    data: { name: name.trim(), email: normalized, passwordHash: await hashPassword(password) }
  });

  return { user, token: signSession(user.id) };
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError("Incorrect email or password", 401);
  }

  return { user, token: signSession(user.id) };
}

export function publicUser(user: { id: string; email: string; name: string; avatar: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatar: user.avatar };
}

export function verifyToken(token: string): string {
  const decoded = jwt.verify(token, env.jwtSecret) as { userId: string };
  return decoded.userId;
}
