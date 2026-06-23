"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
// authLimiter removed — too inconvenient for users; global apiLimiter still active
const router = (0, express_1.Router)();
// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────
const loginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, "Email / NIS / NIP wajib diisi"),
    password: zod_1.z.string().min(1, "Password wajib diisi"),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: zod_1.z
        .string()
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
        .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Refresh token wajib diisi"),
});
// ──────────────────────────────────────────────
// POST /api/auth/login
// Menerima email & password, mengembalikan JWT + data user beserta role
// ──────────────────────────────────────────────
router.post("/login", (0, validate_1.validate)(loginSchema), async (req, res) => {
    try {
        const { identifier, password } = req.body;
        // Normalize identifier
        const normalizedIdentifier = identifier.toLowerCase().trim();
        // Cari user dengan semua identifier — tidak ada batasan per role
        // Semua role bisa login pakai: username, email, userCode, atau nipNis
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { userCode: { equals: identifier, mode: 'insensitive' } },
                    { username: normalizedIdentifier },
                    { email: { equals: identifier, mode: 'insensitive' } },
                    { nipNis: identifier },
                ]
            },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Kredensial login salah",
            });
            return;
        }
        // Verifikasi password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Kredensial login salah",
            });
            return;
        }
        // Generate access + refresh token
        const token = (0, jwt_1.signAccessToken)({ id: user.id, role: user.role });
        const refreshToken = (0, jwt_1.signRefreshToken)({ id: user.id, role: user.role });
        // Response berhasil — sertakan force_change_password
        res.json({
            success: true,
            message: "Login berhasil",
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    nipNis: user.nipNis,
                    username: user.username,
                    role: user.role,
                    force_change_password: user.force_change_password,
                },
            },
        });
    }
    catch (error) {
        console.error("[Auth] Login error:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server. Silakan coba lagi nanti.",
        });
    }
});
// ──────────────────────────────────────────────
// GET /api/auth/me
// Mengambil data user yang sedang login berdasarkan JWT token
// ──────────────────────────────────────────────
router.get("/me", auth_1.verifyJWT, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                force_change_password: true,
                createdAt: true,
                teacher: {
                    select: {
                        id: true,
                        subjects: { select: { id: true, name: true, code: true } },
                        homeroomClasses: { select: { id: true, name: true, level: true } }
                    }
                },
                student: {
                    select: {
                        id: true,
                        class: { select: { id: true, name: true } }
                    }
                },
                guardian: {
                    select: {
                        id: true,
                        students: {
                            select: {
                                id: true,
                                name: true,
                                class: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User tidak ditemukan",
            });
            return;
        }
        res.json({
            success: true,
            data: { user },
        });
    }
    catch (error) {
        console.error("[Auth] Me error:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
        });
    }
});
// ──────────────────────────────────────────────
// PUT /api/auth/change-password
// Mengubah password user yang sedang login
// ──────────────────────────────────────────────
router.put("/change-password", auth_1.verifyJWT, (0, validate_1.validate)(changePasswordSchema), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User tidak ditemukan",
            });
            return;
        }
        // Verifikasi password saat ini
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: "Password lama tidak sesuai",
            });
            return;
        }
        // Password baru tidak boleh sama dengan lama
        if (currentPassword === newPassword) {
            res.status(400).json({
                success: false,
                message: "Password baru tidak boleh sama dengan password lama",
            });
            return;
        }
        // Hash password baru dan simpan
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                force_change_password: false,
            },
        });
        res.json({
            success: true,
            message: "Password berhasil diubah",
        });
    }
    catch (error) {
        console.error("[Auth] Change password error:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server",
        });
    }
});
// ──────────────────────────────────────────────
// POST /api/auth/forgot-password
// Reset password menggunakan Password Default Sistem (Inisial Role + Kode Login)
// Tidak memerlukan JWT — endpoint publik
// ──────────────────────────────────────────────
const forgotPasswordSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, "Email / NIS / NIP wajib diisi"),
    defaultPassword: zod_1.z.string().min(1, "Password default sistem wajib diisi"),
    newPassword: zod_1.z
        .string()
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
        .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
});
router.post("/forgot-password", (0, validate_1.validate)(forgotPasswordSchema), async (req, res) => {
    try {
        const { identifier, defaultPassword, newPassword } = req.body;
        // Normalize identifier (same as login)
        const normalizedIdentifier = identifier.toLowerCase().trim();
        // Cari user dengan semua identifier — konsisten dengan endpoint login
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { userCode: { equals: identifier, mode: 'insensitive' } },
                    { username: normalizedIdentifier },
                    { email: { equals: identifier, mode: 'insensitive' } },
                    { nipNis: identifier },
                ],
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User tidak ditemukan",
            });
            return;
        }
        // Admin tidak menggunakan Kode Login — tolak
        if (user.role === "admin") {
            res.status(403).json({
                success: false,
                message: "Fitur ini tidak tersedia untuk akun admin",
            });
            return;
        }
        // Pastikan user memiliki userCode
        if (!user.userCode) {
            res.status(400).json({
                success: false,
                message: "Akun ini tidak memiliki Kode Login. Hubungi administrator.",
            });
            return;
        }
        // Generate formula Password Default Sistem berdasarkan role
        // userCode may or may not include the role prefix depending on creation path
        const rolePrefixMap = {
            teacher: "G",
            student: "S",
            guardian: "O",
            kepala_sekolah: "K",
        };
        const prefix = rolePrefixMap[user.role];
        if (!prefix) {
            res.status(400).json({
                success: false,
                message: "Role tidak didukung untuk fitur ini",
            });
            return;
        }
        // Build expected default password — handle both prefixed and un-prefixed userCode
        const expectedDefaultPassword = user.userCode.startsWith(prefix)
            ? user.userCode // already prefixed (bulk import / migrated)
            : prefix + user.userCode; // needs prefix (single-create)
        // Bandingkan input user dengan formula
        if (defaultPassword !== expectedDefaultPassword) {
            res.status(400).json({
                success: false,
                message: "Password default sistem tidak sesuai",
            });
            return;
        }
        // Hash password baru dan simpan
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                force_change_password: false,
            },
        });
        res.json({
            success: true,
            message: "Password berhasil diubah",
        });
    }
    catch (error) {
        console.error("[Auth] Forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server. Silakan coba lagi nanti.",
        });
    }
});
// ──────────────────────────────────────────────
// POST /api/auth/refresh
// Menghasilkan access token baru dari refresh token
// ──────────────────────────────────────────────
router.post("/refresh", (0, validate_1.validate)(refreshSchema), async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        if (payload.tokenType && payload.tokenType !== "refresh") {
            res.status(401).json({
                success: false,
                message: "Refresh token tidak valid.",
            });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                name: true,
                email: true,
                nipNis: true,
                username: true,
                role: true,
                force_change_password: true,
            },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Sesi tidak valid. Silakan login kembali.",
            });
            return;
        }
        const nextAccessToken = (0, jwt_1.signAccessToken)({ id: user.id, role: user.role });
        const nextRefreshToken = (0, jwt_1.signRefreshToken)({ id: user.id, role: user.role });
        res.json({
            success: true,
            message: "Token berhasil diperbarui",
            data: {
                token: nextAccessToken,
                refreshToken: nextRefreshToken,
                user,
            },
        });
    }
    catch (error) {
        const isExpired = error instanceof Error && error.name === "TokenExpiredError";
        res.status(401).json({
            success: false,
            message: isExpired
                ? "Refresh token sudah kadaluarsa. Silakan login kembali."
                : "Refresh token tidak valid.",
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.route.js.map