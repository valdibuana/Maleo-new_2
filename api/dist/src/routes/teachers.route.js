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
const teacherSchema = zod_1.z.object({
    nip: zod_1.z.string().min(1, "NIP wajib diisi"),
    name: zod_1.z.string().min(1, "Nama wajib diisi"),
    gender: zod_1.z.enum(["L", "P"]),
    email: zod_1.z.string().email("Email tidak valid"),
    phone: zod_1.z.string().min(1, "Telepon wajib diisi"),
    subject: zod_1.z.string().optional().or(zod_1.z.literal("")),
    subjectIds: zod_1.z.array(zod_1.z.number()).optional(),
    status: zod_1.z.enum(["active", "inactive"]).optional(),
});
// GET /api/teachers
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { search } = req.query;
        const where = { deletedAt: null };
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { nip: { contains: String(search) } },
                { subject: { contains: String(search), mode: "insensitive" } },
            ];
        }
        const teachers = await prisma_1.prisma.teacher.findMany({
            where,
            include: { user: { select: { userCode: true } }, subjects: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        });
        const result = teachers.map((t) => ({
            ...t,
            userCode: t.user?.userCode || null,
        }));
        res.json({ data: result, total: teachers.length });
    }
    catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
// GET /api/teachers/:id
router.get("/:id", auth_1.verifyJWT, async (req, res) => {
    try {
        const teacher = await prisma_1.prisma.teacher.findUnique({
            where: { id: Number(req.params.id) },
            include: { subjects: { select: { id: true, name: true } } }
        });
        if (!teacher) {
            res.status(404).json({ message: "Guru tidak ditemukan" });
            return;
        }
        res.json({ data: teacher });
    }
    catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
// POST /api/teachers
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(teacherSchema), async (req, res) => {
    try {
        const { nip, name, email, subject, subjectIds, ...restData } = req.body;
        const data = { nip, name, email, subject, ...restData };
        // 1. Generate unique username dari nama
        const username = await (0, generateUsername_1.generateUniqueUsername)(name);
        // 2. Generate unique code dengan prefix (e.g. G001)
        let userCode = "";
        let isUnique = false;
        while (!isUnique) {
            const rawCode = await (0, userCode_1.generateUniqueUserCode)("teacher");
            userCode = `G${rawCode}`;
            const exists = await prisma_1.prisma.user.findFirst({ where: { userCode } });
            if (!exists)
                isUnique = true;
        }
        // 3. Generate default password (same as userCode)
        const defaultPassword = userCode;
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, salt);
        // 4. Transaction: buat Teacher dulu, dapat id-nya, baru buat User dengan teacherId FK
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const teacher = await tx.teacher.create({
                data: {
                    ...data,
                    subjects: subjectIds ? { connect: subjectIds.map((id) => ({ id })) } : undefined
                }
            });
            await tx.user.create({
                data: {
                    name,
                    email,
                    nipNis: nip,
                    username, // USERNAME untuk login (bukan NIP)
                    userCode,
                    password: hashedPassword,
                    role: "teacher",
                    teacherId: teacher.id,
                },
            });
            return { teacher, username, userCode, subject };
        });
        res.status(201).json({
            success: true,
            message: `Guru berhasil ditambahkan. Akun login otomatis dibuat dengan Password: ${defaultPassword}`,
            data: {
                ...result.teacher,
                loginUsername: result.username,
                disambiguationHint: result.subject || result.userCode
            }
        });
    }
    catch (error) {
        if (error.code === "P2002") {
            // Retry once with timestamp if race condition
            if (error.meta?.target?.includes("username")) {
                try {
                    const fallbackUsername = `${req.body.name.split(" ")[0].toLowerCase()}${Date.now().toString().slice(-4)}`;
                    const rawCode = await (0, userCode_1.generateUniqueUserCode)("teacher");
                    const userCode = `G${rawCode}`;
                    const defaultPassword = userCode;
                    const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
                    const result = await prisma_1.prisma.$transaction(async (tx) => {
                        const teacher = await tx.teacher.create({ data: req.body });
                        await tx.user.create({
                            data: {
                                name: req.body.name,
                                email: req.body.email,
                                nipNis: req.body.nip,
                                username: fallbackUsername,
                                userCode,
                                password: hashedPassword,
                                role: "teacher",
                                teacherId: teacher.id,
                            },
                        });
                        return { teacher, username: fallbackUsername };
                    });
                    return res.status(201).json({
                        success: true,
                        message: `Guru berhasil ditambahkan. Akun login otomatis dibuat dengan Password: ${defaultPassword}`,
                        data: { ...result.teacher, loginUsername: result.username }
                    });
                }
                catch (retryError) {
                    console.error("[Teachers] Retry failed:", retryError);
                }
            }
            res.status(400).json({ success: false, message: "NIP atau email sudah digunakan" });
            return;
        }
        console.error("[Teachers] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat membuat data guru" });
    }
});
// PUT /api/teachers/:id
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(teacherSchema.partial()), async (req, res) => {
    try {
        const teacherId = Number(req.params.id);
        const { subjectIds, ...data } = req.body;
        const updateData = { ...data };
        if (subjectIds) {
            // Pre-flight check: Cannot unassign a subject directly from here
            // because Subject.teacherId is required in the database.
            const currentSubjects = await prisma_1.prisma.subject.findMany({ where: { teacherId } });
            const removedSubjects = currentSubjects.filter(s => !subjectIds.includes(s.id));
            if (removedSubjects.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Tidak dapat menghapus mata pelajaran (${removedSubjects.map(s => s.name).join(', ')}). Karena setiap mata pelajaran wajib memiliki guru, silakan alihkan mata pelajaran ini ke guru lain melalui menu 'Mata Pelajaran' terlebih dahulu.`
                });
            }
            updateData.subjects = { set: subjectIds.map((id) => ({ id })) };
        }
        const teacher = await prisma_1.prisma.teacher.update({
            where: { id: teacherId },
            data: updateData
        });
        res.json({ message: "Guru berhasil diperbarui", data: teacher });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ message: "Guru tidak ditemukan" });
            return;
        }
        console.error("[Teachers] PUT error:", error);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
// DELETE /api/teachers/:id (soft delete)
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        // 1. Pengecekan Relasi (Safe Delete)
        const [hasSubjects, hasSchedules, hasHomeroom] = await Promise.all([
            prisma_1.prisma.subject.findFirst({ where: { teacherId: id } }),
            prisma_1.prisma.schedule.findFirst({ where: { teacherId: id } }),
            prisma_1.prisma.class.findFirst({ where: { homeroomTeacherId: id } }),
        ]);
        if (hasSubjects || hasSchedules || hasHomeroom) {
            return res.status(400).json({
                success: false,
                message: "Tidak dapat menghapus data: Guru yang bersangkutan masih memiliki beban mengajar atau terdaftar sebagai Wali Kelas. Silakan kosongkan atau pindahkan data terlebih dahulu."
            });
        }
        // 2. Soft delete: set deletedAt timestamp
        const teacher = await prisma_1.prisma.teacher.findUnique({ where: { id } });
        if (!teacher || teacher.deletedAt) {
            return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            // Mark teacher as deleted
            await tx.teacher.update({
                where: { id },
                data: { deletedAt: new Date(), status: "inactive" },
            });
        });
        res.json({ success: true, message: "Guru berhasil dihapus (soft delete)" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
            return;
        }
        console.error("[Teachers] DELETE error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=teachers.route.js.map