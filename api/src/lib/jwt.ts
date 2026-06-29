import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

// JWT_SECRET is validated at startup in index.ts - safe to use non-null assertion
const ACCESS_SECRET: string = process.env.JWT_SECRET!;
const REFRESH_SECRET: string = (() => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_REFRESH_SECRET tidak di-set di environment variables. " +
      "Tambahkan JWT_REFRESH_SECRET ke file .env"
    );
  }
  return secret;
})();
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

export interface JwtPayload {
  id: number;
  role: string;
  tokenType?: "access" | "refresh";
  jti?: string; // JWT ID - unique token identifier for rotation tracking
}

/**
 * Generate a unique token ID (jti) for refresh token rotation tracking.
 */
export function generateTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Hash a refresh token JWT string using SHA-256.
 * The hash is stored in the database instead of the raw JWT.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, tokenType: "access" }, ACCESS_SECRET, options);
}

/**
 * Sign a refresh token with a unique jti for rotation tracking.
 * @param payload - The JWT payload (id, role)
 * @param tokenId - The unique token ID (jti) generated via generateTokenId()
 */
export function signRefreshToken(payload: JwtPayload, tokenId: string): string {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, tokenType: "refresh", jti: tokenId }, REFRESH_SECRET, options);
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
