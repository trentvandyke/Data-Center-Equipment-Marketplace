import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export type SessionPayload = {
  sub: string;
  role: string;
  email: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Copy .env.example to .env.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: typeof payload.role === "string" ? payload.role : "",
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

export function safeNext(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("\\")) {
    return null;
  }
  if (value.startsWith("/login") || value.startsWith("/signup")) return null;
  return value;
}
