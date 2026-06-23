/**
 * Base application error class.
 * All custom errors extend this so the global handler can process them uniformly.
 */
export declare class AppError extends Error {
    statusCode: number;
    details?: any | undefined;
    constructor(statusCode: number, message: string, details?: any | undefined);
}
/** 400 — Bad Request */
export declare class BadRequestError extends AppError {
    constructor(message?: string, details?: any);
}
/** 401 — Unauthorized */
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
/** 403 — Forbidden */
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
/** 404 — Not Found */
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/** 409 — Conflict (e.g. duplicate entry) */
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map