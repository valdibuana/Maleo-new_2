import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken, JwtPayload } from "../lib/jwt";

/**
 * Extends Express Request dengan data user yang sudah terautentikasi.
 * Properti `user` tersedia setelah middleware `verifyJWT` dijalankan.
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Middleware untuk memverifikasi JWT token dari header Authorization.
 * Format: `Authorization: Bearer <token>`
 *
 * Jika valid, `req.user` akan terisi dengan payload { id, role }.
 */
export const verifyJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  // Only accept Authorization: Bearer <token> header — no query string fallback
  if (!header || !header.startsWith("Bearer ")) {
    console.log(`[Auth] Token missing for ${req.method} ${req.originalUrl}`);
    res.status(401).json({
      success: false,
      message: "Token tidak ditemukan. Silakan login terlebih dahulu.",
    });
    return;
  }

  // Extract token and validate it exists
  const parts = header.split(" ");
  if (parts.length !== 2 || !parts[1]) {
    console.log(`[Auth] Malformed Authorization header for ${req.method} ${req.originalUrl}`);
    res.status(401).json({
      success: false,
      message: "Format token tidak valid.",
    });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);

    if (payload.tokenType && payload.tokenType !== "access") {
      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN_TYPE",
        message: "Jenis token tidak valid.",
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    // Bedakan antara token expired dan token invalid
    const isExpired = error instanceof Error && error.name === "TokenExpiredError";
    res.status(401).json({
      success: false,
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
      message: isExpired
        ? "Token sudah kadaluarsa. Silakan login kembali."
        : "Token tidak valid.",
    });
  }
};
