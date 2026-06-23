import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AuthRequest } from "./auth";
/**
 * Middleware factory untuk membatasi akses berdasarkan role pengguna.
 *
 * Menerima satu atau lebih Role dari Prisma enum sehingga type-safe.
 * Harus digunakan SETELAH middleware `verifyJWT`.
 *
 * @example
 * // Hanya guru yang boleh mengakses
 * router.post("/", verifyJWT, checkRole("teacher"), handler);
 *
 * // Siswa dan orang tua boleh mengakses
 * router.get("/", verifyJWT, checkRole("student", "guardian"), handler);
 *
 * // Admin saja
 * router.delete("/:id", verifyJWT, checkRole("admin"), handler);
 */
export declare const checkRole: (...allowedRoles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=role.d.ts.map