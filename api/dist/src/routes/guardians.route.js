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
const userCode_1 = require("../lib/userCode");
const generateUsername_1 = require("../lib/generateUsername");
const router = (0, express_1.Router)();
const guardianSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama wajib diisi"),
    phone: zod_1.z.string().min(1, "Telepon wajib diisi"),
    email: zod_1.z.string().email("Email tidak valid"),
    address: zod_1.z.string().min(1, "Alamat wajib diisi"),
    occupation: zod_1.z.string().min(1, "Pekerjaan wajib diisi"),
});
// GET /api/guardians
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { phone: { contains: String(search) } },
            ];
        }
        const guardians = await prisma_1.prisma.guardian.findMany({
            where,
            include: {
                students: { select: { id: true, name: true, class: { select: { name: true } } } },
                user: { select: { userCode: true } },
            },
            orderBy: { name: "asc" },
        });
        const result = guardians.map((g) => ({
            id: g.id,
            name: g.name,
            phone: g.phone,
            email: g.email,
            address: g.address,
            occupation: g.occupation,
            userCode: g.user?.userCode || null,
            children: g.students.map((s) => ({ id: s.id, name: s.name, className: s.class?.name })),
        }));
        res.json({ success: true, data: result, total: result.length });
    }
    catch (error) {
        console.error("[Guardians] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// GET /api/guardians/:id
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const guardian = await prisma_1.prisma.guardian.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                students: {
                    select: { id: true, name: true, class: { select: { name: true } } },
                },
            },
        });
        if (!guardian) {
            res.status(404).json({ success: false, message: "Wali murid tidak ditemukan" });
            return;
        }
        res.json({ success: true, data: guardian });
    }
    catch (error) {
        console.error("[Guardians] GET by ID error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// POST /api/guardians
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(guardianSchema), async (req, res) => {
    try {
        const data = req.body;
        const { name, email, phone } = data;
        // 1. Generate unique username dari nama
        const username = await (0, generateUsername_1.generateUniqueUsername)(name);
        // 2. Generate unique code dengan prefix (e.g. O001)
        let userCode = "";
        let isUnique = false;
        while (!isUnique) {
            const rawCode = await (0, userCode_1.generateUniqueUserCode)("guardian");
            userCode = `O${rawCode}`;
            const exists = await prisma_1.prisma.user.findFirst({ where: { userCode } });
            if (!exists)
                isUnique = true;
        }
        // 3. Generate default password (same as userCode)
        const defaultPassword = userCode;
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, salt);
        // 4. Transaction: buat Guardian dulu, dapat id-nya, baru buat User dengan guardianId FK
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const guardian = await tx.guardian.create({ data });
            await tx.user.create({
                data: {
                    name,
                    email, // EMAIL tetap disimpan sebagai data identitas
                    nipNis: email, // kept for backward-compat (non-login purpose)
                    username, // USERNAME untuk login (bukan email)
                    userCode,
                    password: hashedPassword,
                    role: "guardian",
                    force_change_password: true,
                    guardianId: guardian.id,
                },
            });
            // Coba ambil nama anak yang sudah di-link (jika ada)
            const linkedStudent = await tx.student.findFirst({
                where: { guardians: { some: { id: guardian.id } } },
                select: { name: true }
            });
            return { guardian, username, linkedStudent };
        });
        res.status(201).json({
            success: true,
            message: `Wali murid "${result.guardian.name}" berhasil ditambahkan.
Email: ${result.guardian.email} (data kontak).
Login menggunakan Username: "${result.username}".
Password: ${defaultPassword}`,
            data: {
                ...result.guardian,
                loginUsername: result.username,
                disambiguationHint: result.linkedStudent?.name || "-"
            }
        });
    }
    catch (error) {
        if (error.code === "P2002") {
            // Retry once with timestamp if race condition on username
            if (error.meta?.target?.includes("username")) {
                try {
                    const fallbackUsername = `${req.body.name.split(" ")[0].toLowerCase()}${Date.now().toString().slice(-4)}`;
                    const userCode = await (0, userCode_1.generateUniqueUserCode)("guardian");
                    const defaultPassword = `O${userCode}`;
                    const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
                    const result = await prisma_1.prisma.$transaction(async (tx) => {
                        const guardian = await tx.guardian.create({ data: req.body });
                        await tx.user.create({
                            data: {
                                name: req.body.name,
                                email: req.body.email,
                                nipNis: req.body.email,
                                username: fallbackUsername,
                                userCode,
                                password: hashedPassword,
                                role: "guardian",
                                guardianId: guardian.id,
                            },
                        });
                        return { guardian, username: fallbackUsername };
                    });
                    return res.status(201).json({
                        success: true,
                        message: `Wali murid berhasil ditambahkan. Login dengan Username: ${result.username}`,
                        data: { ...result.guardian, loginUsername: result.username }
                    });
                }
                catch (retryError) {
                    console.error("[Guardians] Retry failed:", retryError);
                }
            }
            res.status(400).json({ success: false, message: "Nomor telepon atau email sudah digunakan" });
            return;
        }
        console.error("[Guardians] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat membuat data wali murid" });
    }
});
// PUT /api/guardians/:id
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(guardianSchema.partial()), async (req, res) => {
    try {
        const data = req.body;
        const guardianId = Number(req.params.id);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const updatedGuardian = await tx.guardian.update({
                where: { id: guardianId },
                data,
            });
            // Jika email atau nama diupdate, sinkronkan ke tabel User
            if (data.email || data.name) {
                const updateData = {};
                if (data.name)
                    updateData.name = data.name;
                if (data.email) {
                    updateData.email = data.email;
                    updateData.nipNis = data.email;
                }
                // Update user yang terkait
                const user = await tx.user.findUnique({ where: { guardianId } });
                if (user) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: updateData,
                    });
                }
            }
            return updatedGuardian;
        });
        res.json({ success: true, message: "Wali murid berhasil diperbarui", data: result });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Wali murid tidak ditemukan" });
            return;
        }
        if (error.code === "P2002") {
            res.status(400).json({ success: false, message: "Email atau nomor telepon sudah digunakan" });
            return;
        }
        console.error("[Guardians] PUT error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// DELETE /api/guardians/:id
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const guardianId = Number(req.params.id);
        await prisma_1.prisma.$transaction(async (tx) => {
            // Soft delete guardian
            await tx.guardian.update({
                where: { id: guardianId },
                data: { deletedAt: new Date() },
            });
            // Nonaktifkan user yang terkait tapi jangan hapus
            await tx.user.updateMany({
                where: { guardianId },
                data: { password: "DEACTIVATED_" + Date.now() },
            });
        });
        res.json({ success: true, message: "Wali murid berhasil dipindahkan ke Recycle Bin" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Wali murid tidak ditemukan" });
            return;
        }
        console.error("[Guardians] DELETE error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// GET /api/guardians/:id/students
router.get("/:id/students", auth_1.verifyJWT, async (req, res) => {
    try {
        const guardian = await prisma_1.prisma.guardian.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                students: {
                    select: {
                        id: true,
                        name: true,
                        nis: true,
                        status: true,
                        class: { select: { name: true } }
                    }
                }
            }
        });
        if (!guardian) {
            res.status(404).json({ success: false, message: "Wali murid tidak ditemukan." });
            return;
        }
        res.json({ success: true, data: guardian.students });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// POST /api/guardians/:id/assign-student
router.post("/:id/assign-student", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            res.status(403).json({ success: false, message: "Akses ditolak." });
            return;
        }
        const { studentId } = req.body;
        if (!studentId) {
            res.status(400).json({ success: false, message: "studentId wajib diisi." });
            return;
        }
        // Cek apakah student sudah terhubung
        const existing = await prisma_1.prisma.guardian.findFirst({
            where: {
                id: Number(req.params.id),
                students: { some: { id: Number(studentId) } }
            }
        });
        if (existing) {
            res.status(400).json({
                success: false,
                message: "Siswa sudah terhubung ke wali murid ini."
            });
            return;
        }
        await prisma_1.prisma.guardian.update({
            where: { id: Number(req.params.id) },
            data: {
                students: { connect: { id: Number(studentId) } }
            }
        });
        res.json({ success: true, message: "Siswa berhasil dihubungkan ke wali murid." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// DELETE /api/guardians/:id/remove-student/:studentId
router.delete("/:id/remove-student/:studentId", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            res.status(403).json({ success: false, message: "Akses ditolak." });
            return;
        }
        await prisma_1.prisma.guardian.update({
            where: { id: Number(req.params.id) },
            data: {
                students: { disconnect: { id: Number(req.params.studentId) } }
            }
        });
        res.json({ success: true, message: "Relasi siswa berhasil dilepas." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
exports.default = router;
//# sourceMappingURL=guardians.route.js.map