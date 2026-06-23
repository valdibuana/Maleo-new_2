"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const validate_1 = require("../middleware/validate");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateUsername_1 = require("../lib/generateUsername");
const router = (0, express_1.Router)();
// Helper: convert empty string "" to null before Zod validates
const emptyToNull = (val) => (val === "" ? null : val);
// Validation Schemas
const principalCreateSchema = zod_1.z.object({
    nip: zod_1.z.string().min(1, "NIP wajib diisi"),
    name: zod_1.z.string().min(1, "Nama wajib diisi"),
    phone: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
    gender: zod_1.z.preprocess(emptyToNull, zod_1.z.enum(["L", "P"]).nullable().optional()),
    email: zod_1.z.preprocess(emptyToNull, zod_1.z.string().email("Format email tidak valid").nullable().optional()),
    address: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
});
const principalUpdateSchema = zod_1.z.object({
    nip: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
    gender: zod_1.z.preprocess(emptyToNull, zod_1.z.enum(["L", "P"]).nullable().optional()),
    email: zod_1.z.preprocess(emptyToNull, zod_1.z.string().email("Format email tidak valid").nullable().optional()),
    address: zod_1.z.preprocess(emptyToNull, zod_1.z.string().nullable().optional()),
});
// ─────────────────────────────────────────────────────────
// GET /api/principals
// ─────────────────────────────────────────────────────────
router.get("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const principals = await prisma_1.prisma.principal.findMany({
            include: {
                user: { select: { id: true, userCode: true, force_change_password: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ success: true, data: principals });
    }
    catch (error) {
        console.error("[Principals] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// ─────────────────────────────────────────────────────────
// POST /api/principals
// ─────────────────────────────────────────────────────────
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(principalCreateSchema), async (req, res) => {
    try {
        const { nip, name, email, phone, gender, address } = req.body;
        // 1. Check NIP uniqueness
        const existingPrincipal = await prisma_1.prisma.principal.findUnique({ where: { nip } });
        if (existingPrincipal) {
            res.status(400).json({ success: false, message: "NIP sudah terdaftar" });
            return;
        }
        // 2. Check email uniqueness (if provided)
        if (email) {
            const existingEmail = await prisma_1.prisma.principal.findUnique({ where: { email } });
            if (existingEmail) {
                res.status(400).json({ success: false, message: "Email sudah digunakan" });
                return;
            }
            const existingUserEmail = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (existingUserEmail) {
                res.status(400).json({ success: false, message: "Email sudah digunakan oleh akun lain" });
                return;
            }
        }
        // 3. Generate sequential principalCode: K001, K002, …
        const count = await prisma_1.prisma.principal.count();
        const principalCode = `K${String(count + 1).padStart(3, "0")}`;
        // 4. Hash password default = principalCode
        const hashedPassword = await bcryptjs_1.default.hash(principalCode, 10);
        // 5. Generate unique username from name (for login identifier)
        const username = await (0, generateUsername_1.generateUniqueUsername)(name);
        // 6. Database transaction
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const principal = await tx.principal.create({
                data: {
                    nip,
                    name,
                    phone: phone ?? null,
                    gender: gender ?? null,
                    email: email ?? null,
                    address: address ?? null,
                    principalCode,
                },
            });
            const user = await tx.user.create({
                data: {
                    name,
                    role: "kepala_sekolah",
                    nipNis: nip,
                    userCode: principalCode,
                    username,
                    email: email ?? null,
                    password: hashedPassword,
                    force_change_password: true,
                    principalId: principal.id,
                },
            });
            return { principal, user };
        });
        res.status(201).json({
            success: true,
            message: "Kepala Sekolah berhasil ditambahkan",
            data: {
                ...result.principal,
                userCode: result.user.userCode,
            },
        });
    }
    catch (error) {
        console.error("[Principals] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// ─────────────────────────────────────────────────────────
// PUT /api/principals/:id
// ─────────────────────────────────────────────────────────
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(principalUpdateSchema), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, nip, phone, gender, email, address } = req.body;
        // Check if principal exists
        const existing = await prisma_1.prisma.principal.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!existing) {
            res.status(404).json({ success: false, message: "Data tidak ditemukan" });
            return;
        }
        // Check email uniqueness if changing
        if (email && email !== existing.email) {
            const emailTakenPrincipal = await prisma_1.prisma.principal.findUnique({ where: { email } });
            if (emailTakenPrincipal && emailTakenPrincipal.id !== id) {
                res.status(400).json({ success: false, message: "Email sudah digunakan" });
                return;
            }
            const emailTakenUser = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (emailTakenUser && emailTakenUser.principalId !== id) {
                res.status(400).json({ success: false, message: "Email sudah digunakan oleh akun lain" });
                return;
            }
        }
        // Check NIP uniqueness if changing
        if (nip && nip !== existing.nip) {
            const nipTaken = await prisma_1.prisma.principal.findUnique({ where: { nip } });
            if (nipTaken) {
                res.status(400).json({ success: false, message: "NIP sudah terdaftar" });
                return;
            }
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.principal.update({
                where: { id },
                data: {
                    name: name ?? undefined,
                    nip: nip ?? undefined,
                    phone: phone ?? undefined,
                    gender: gender ?? undefined,
                    email: email ?? undefined,
                    address: address ?? undefined,
                },
            });
            if (existing.user) {
                // Generate new username if name changed
                let newUsername;
                if (name && name !== existing.name) {
                    newUsername = await (0, generateUsername_1.generateUniqueUsername)(name);
                }
                await tx.user.update({
                    where: { id: existing.user.id },
                    data: {
                        name: name ?? undefined,
                        nipNis: nip ?? undefined,
                        email: email !== undefined ? email : undefined,
                        username: newUsername ?? undefined,
                    },
                });
            }
        });
        res.json({ success: true, message: "Data berhasil diperbarui" });
    }
    catch (error) {
        console.error("[Principals] PUT error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// ─────────────────────────────────────────────────────────
// DELETE /api/principals/:id
// ─────────────────────────────────────────────────────────
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const principal = await prisma_1.prisma.principal.findUnique({ where: { id } });
        if (!principal) {
            res.status(404).json({ success: false, message: "Data tidak ditemukan" });
            return;
        }
        // Delete User first (FK constraint), then Principal
        await prisma_1.prisma.user.deleteMany({ where: { principalId: id } });
        await prisma_1.prisma.principal.delete({ where: { id } });
        res.json({ success: true, message: "Data Kepala Sekolah berhasil dihapus" });
    }
    catch (error) {
        console.error("[Principals] DELETE error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// ─────────────────────────────────────────────────────────
// POST /api/principals/:id/reset-password
// ─────────────────────────────────────────────────────────
router.post("/:id/reset-password", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const principal = await prisma_1.prisma.principal.findUnique({ where: { id } });
        if (!principal) {
            res.status(404).json({ success: false, message: "Data tidak ditemukan" });
            return;
        }
        // Hash principalCode as new password
        const hashed = await bcryptjs_1.default.hash(principal.principalCode, 10);
        await prisma_1.prisma.user.updateMany({
            where: { principalId: id },
            data: { password: hashed, force_change_password: true },
        });
        res.json({
            success: true,
            message: `Password berhasil direset ke kode sistem (${principal.principalCode})`,
        });
    }
    catch (error) {
        console.error("[Principals] RESET-PASSWORD error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=principals.route.js.map