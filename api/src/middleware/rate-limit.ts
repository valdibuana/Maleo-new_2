import rateLimit from "express-rate-limit";

/**
 * Global API rate limiter — 100 requests per 15 minutes per IP.
 * Applied to all /api routes in index.ts.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
  },
});

/**
 * Strict limiter for authentication endpoints — 5 attempts per 15 minutes per IP.
 * Applied to /api/auth/login and /api/auth/forgot-password.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.",
  },
});

/**
 * Upload limiter — 10 uploads per 15 minutes per IP.
 * Applied to file upload routes.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak unggahan. Silakan coba lagi nanti.",
  },
});
