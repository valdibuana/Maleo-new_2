"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
// Skema validasi untuk pembuatan user
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama wajib diisi"),
    email: zod_1.z.string().email("Format email tidak valid"),
    password: zod_1.z.string().min(6, "Password minimal 6 karakter").optional(),
    role: zod_1.z.enum(["admin", "kepala_sekolah", "teacher", "student", "guardian"], {
        errorMap: () => ({ message: "Role tidak valid" }),
    }),
});
// Skema validasi untuk update user (semua field opsional)
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama tidak boleh kosong").optional(),
    email: zod_1.z.string().email("Format email tidak valid").optional(),
    password: zod_1.z.string().min(6, "Password minimal 6 karakter").optional(),
    role: zod_1.z.enum(["admin", "kepala_sekolah", "teacher", "student", "guardian"]).optional(),
});
// ──────────────────────────────────────────────
// Manajemen Pengguna (Khusus Admin)
// ──────────────────────────────────────────────
// GET /api/users - Ambil semua user
router.get("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), user_controller_1.getAllUsers);
// POST /api/users - Buat user baru
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(createUserSchema), user_controller_1.createUser);
// PUT /api/users/:id - Update user
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(updateUserSchema), user_controller_1.updateUser);
// DELETE /api/users/:id - Hapus user
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), user_controller_1.deleteUser);
exports.default = router;
//# sourceMappingURL=user.route.js.map