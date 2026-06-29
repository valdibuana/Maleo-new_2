"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
exports.generateTokenId = generateTokenId;
exports.hashToken = hashToken;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.decodeTokenPayload = decodeTokenPayload;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// JWT_SECRET is validated at startup in index.ts - safe to use non-null assertion
const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = (() => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error("JWT_REFRESH_SECRET tidak di-set di environment variables. " +
            "Tambahkan JWT_REFRESH_SECRET ke file .env");
    }
    return secret;
})();
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
/**
 * Generate a unique token ID (jti) for refresh token rotation tracking.
 */
function generateTokenId() {
    return crypto_1.default.randomUUID();
}
/**
 * Hash a refresh token JWT string using SHA-256.
 * The hash is stored in the database instead of the raw JWT.
 */
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function signAccessToken(payload) {
    const options = {
        expiresIn: ACCESS_EXPIRES_IN,
    };
    return jsonwebtoken_1.default.sign({ ...payload, tokenType: "access" }, ACCESS_SECRET, options);
}
/**
 * Sign a refresh token with a unique jti for rotation tracking.
 * @param payload - The JWT payload (id, role)
 * @param tokenId - The unique token ID (jti) generated via generateTokenId()
 */
function signRefreshToken(payload, tokenId) {
    const options = {
        expiresIn: REFRESH_EXPIRES_IN,
    };
    return jsonwebtoken_1.default.sign({ ...payload, tokenType: "refresh", jti: tokenId }, REFRESH_SECRET, options);
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