import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "../lib/jwt";
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
export declare const verifyJWT: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map