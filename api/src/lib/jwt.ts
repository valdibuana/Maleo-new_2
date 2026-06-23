import jwt, { SignOptions } from "jsonwebtoken";

// JWT_SECRET is validated at startup in index.ts — safe to use non-null assertion
const ACCESS_SECRET: string = process.env.JWT_SECRET!;
const REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || ACCESS_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

export interface JwtPayload {
  id: number;
  role: string;
  tokenType?: "access" | "refresh";
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, tokenType: "access" }, ACCESS_SECRET, options);
}

export function signRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, tokenType: "refresh" }, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

// Backward-compatible aliases for older imports.
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;

/**
 * Decode JWT payload without verification (for routing only).
 * Real verification must always happen on the backend.
 */
export function decodeTokenPayload(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    return decoded && decoded.id && decoded.role ? decoded : null;
  } catch {
    return null;
  }
}
