"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Global API rate limiter — 100 requests per 15 minutes per IP.
 * Applied to all /api routes in index.ts.
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: "Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.",
    },
});
/**
 * Upload limiter — 10 uploads per 15 minutes per IP.
 * Applied to file upload routes.
 */
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Terlalu banyak unggahan. Silakan coba lagi nanti.",
    },
});
//# sourceMappingURL=rate-limit.js.map