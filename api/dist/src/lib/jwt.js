"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.decodeTokenPayload = decodeTokenPayload;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT_SECRET is validated at startup in index.ts — safe to use non-null assertion
const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || ACCESS_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
function signAccessToken(payload) {
    const options = {
        expiresIn: ACCESS_EXPIRES_IN,
    };
    return jsonwebtoken_1.default.sign({ ...payload, tokenType: "access" }, ACCESS_SECRET, options);
}
function signRefreshToken(payload) {
    const options = {
        expiresIn: REFRESH_EXPIRES_IN,
    };
    return jsonwebtoken_1.default.sign({ ...payload, tokenType: "refresh" }, REFRESH_SECRET, options);
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
// Backward-compatible aliases for older imports.
exports.signToken = signAccessToken;
exports.verifyToken = verifyAccessToken;
/**
 * Decode JWT payload without verification (for routing only).
 * Real verification must always happen on the backend.
 */
function decodeTokenPayload(token) {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        return decoded && decoded.id && decoded.role ? decoded : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map