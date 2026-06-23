/**
 * Base application error class.
 * All custom errors extend this so the global handler can process them uniformly.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — Bad Request */
export class BadRequestError extends AppError {
  constructor(message = "Permintaan tidak valid", details?: any) {
    super(400, message, details);
  }
}

/** 401 — Unauthorized */
export class UnauthorizedError extends AppError {
  constructor(message = "Autentikasi diperlukan. Silakan login terlebih dahulu.") {
    super(401, message);
  }
}

/** 403 — Forbidden */
export class ForbiddenError extends AppError {
  constructor(message = "Akses ditolak. Anda tidak memiliki izin.") {
    super(403, message);
  }
}

/** 404 — Not Found */
export class NotFoundError extends AppError {
  constructor(message = "Data tidak ditemukan") {
    super(404, message);
  }
}

/** 409 — Conflict (e.g. duplicate entry) */
export class ConflictError extends AppError {
  constructor(message = "Data sudah ada di sistem") {
    super(409, message);
  }
}
