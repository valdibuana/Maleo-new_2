import { Request, Response } from "express";
/**
 * Mendapatkan semua user (Admin only)
 */
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
/**
 * Menambahkan pengguna baru (Admin only)
 */
export declare const createUser: (req: Request, res: Response) => Promise<void>;
/**
 * Mengubah data pengguna berdasarkan ID (Admin only)
 */
export declare const updateUser: (req: Request, res: Response) => Promise<void>;
/**
 * Menghapus pengguna berdasarkan ID (Admin only)
 */
export declare const deleteUser: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map