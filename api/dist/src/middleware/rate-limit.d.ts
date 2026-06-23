/**
 * Global API rate limiter — 100 requests per 15 minutes per IP.
 * Applied to all /api routes in index.ts.
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict limiter for authentication endpoints — 5 attempts per 15 minutes per IP.
 * Applied to /api/auth/login and /api/auth/forgot-password.
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Upload limiter — 10 uploads per 15 minutes per IP.
 * Applied to file upload routes.
 */
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rate-limit.d.ts.map