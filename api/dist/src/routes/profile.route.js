"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
/**
 * Validasi skema untuk update profil
 */
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama wajib diisi").optional(),
    email: zod_1.z.string().email("Format email tidak valid").optional(),
    password: zod_1.z.string().min(8, "Password minimal 8 karakter").optional(),
});
// GET /api/profile
// Mengambil data profil user yang sedang login
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                userCode: true,
                nipNis: true,
                createdAt: true,
                student: true,
                teacher: true,
                principal: true,
                guardian: true,
            },
        });
        if (!user) {
            res.status(404).json({ success: false, message: "User tidak ditemukan" });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error("[Profile] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// PUT /api/profile
// Memperbarui profil user yang sedang login
router.put("/", auth_1.verifyJWT, (0, validate_1.validate)(updateProfileSchema), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userId = req.user.id;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(404).json({ success: false, message: "User tidak ditemukan" });
            return;
        }
        // Cek apakah email sudah digunakan oleh user lain
        if (email) {
            const existing = await prisma_1.prisma.user.findFirst({
                where: { email, NOT: { id: userId } },
            });
            if (existing) {
                res.status(400).json({ success: false, message: "Email sudah digunakan" });
                return;
            }
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            updateData.password = await bcryptjs_1.default.hash(password, salt);
        }
        const transaction = [];
        // 1. Update tabel User
        transaction.push(prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
        }));
        // 2. Update tabel spesifik berdasarkan role
        if (name || email) {
            if (user.studentId && name) {
                transaction.push(prisma_1.prisma.student.update({
                    where: { id: user.studentId },
                    data: { name },
                }));
            }
            if (user.teacherId) {
                const teacherUpdate = {};
                if (name)
                    teacherUpdate.name = name;
                if (email)
                    teacherUpdate.email = email;
                transaction.push(prisma_1.prisma.teacher.update({
                    where: { id: user.teacherId },
                    data: teacherUpdate,
                }));
            }
            if (user.principalId) {
                const principalUpdate = {};
                if (name)
                    principalUpdate.name = name;
                if (email)
                    principalUpdate.email = email;
                transaction.push(prisma_1.prisma.principal.update({
                    where: { id: user.principalId },
                    data: principalUpdate,
                }));
            }
            if (user.guardianId) {
                const guardianUpdate = {};
                if (name)
                    guardianUpdate.name = name;
                if (email)
                    guardianUpdate.email = email;
                transaction.push(prisma_1.prisma.guardian.update({
                    where: { id: user.guardianId },
                    data: guardianUpdate,
                }));
            }
        }
        await prisma_1.prisma.$transaction(transaction);
        // Ambil data user terbaru untuk dikembalikan
        const updatedUser = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });
        res.json({ success: true, message: "Profil berhasil diperbarui", data: updatedUser });
    }
    catch (error) {
        console.error("[Profile] PUT error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat memperbarui profil" });
    }
});
exports.default = router;
//# sourceMappingURL=profile.route.js.map