"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
/**
 * Base application error class.
 * All custom errors extend this so the global handler can process them uniformly.
 */
class AppError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/** 400 — Bad Request */
class BadRequestError extends AppError {
    constructor(message = "Permintaan tidak valid", details) {
        super(400, message, details);
    }
}
exports.BadRequestError = BadRequestError;
/** 401 — Unauthorized */
class UnauthorizedError extends AppError {
    constructor(message = "Autentikasi diperlukan. Silakan login terlebih dahulu.") {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
/** 403 — Forbidden */
class ForbiddenError extends AppError {
    constructor(message = "Akses ditolak. Anda tidak memiliki izin.") {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
/** 404 — Not Found */
class NotFoundError extends AppError {
    constructor(message = "Data tidak ditemukan") {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
/** 409 — Conflict (e.g. duplicate entry) */
class ConflictError extends AppError {
    constructor(message = "Data sudah ada di sistem") {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=errors.js.map