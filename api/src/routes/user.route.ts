import { Router } from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

// Skema validasi untuk pembuatan user
const createUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.enum(["admin", "kepala_sekolah", "teacher", "student", "guardian"], {
    errorMap: () => ({ message: "Role tidak valid" }),
  }),
});

// Skema validasi untuk update user (semua field opsional)
const updateUserSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong").optional(),
  email: z.string().email("Format email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.enum(["admin", "kepala_sekolah", "teacher", "student", "guardian"]).optional(),
});

// ──────────────────────────────────────────────
// Manajemen Pengguna (Khusus Admin)
// ──────────────────────────────────────────────

// GET /api/users - Ambil semua user
router.get(
  "/",
  verifyJWT,
  checkRole("admin"),
  getAllUsers
);

// POST /api/users - Buat user baru
router.post(
  "/",
  verifyJWT,
  checkRole("admin"),
  validate(createUserSchema),
  createUser
);

// PUT /api/users/:id - Update user
router.put(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  validate(updateUserSchema),
  updateUser
);

// DELETE /api/users/:id - Hapus user
router.delete(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  deleteUser
);

export default router;
