import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { User, Employee } from "@prisma/client";
export { isOwnerRole, isFieldRole, isWarehouseRole, defaultPathForRole } from "./roles";

const COOKIE = "wyg-erp-session";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "walled-yehya-group-dev-secret-change-in-production"
);

export type SessionPayload = {
  userId: string;
  role: string;
  orgId: string;
};

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  if (hash === "dev-only") return password === "1234";
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as SessionPayload;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type AuthUser = User & { employee: Employee | null };

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.userId, isActive: true },
      include: { employee: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

