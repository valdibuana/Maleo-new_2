"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const subjectSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, "Kode mapel wajib diisi"),
    name: zod_1.z.string().min(1, "Nama mapel wajib diisi"),
    gradeLevel: zod_1.z.coerce.number().int().positive("Tingkat harus angka positif"),
    hoursPerWeek: zod_1.z.coerce.number().int().positive("Jam per minggu harus angka positif"),
    teacherId: zod_1.z.coerce.number().int().positive("ID guru tidak valid"),
});
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};
        // Hard filtering for teacher role
        const reqUser = req.user;
        if (reqUser?.role === "teacher") {
            // Find teacherId from User
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: reqUser.id },
                select: { teacherId: true }
            });
            if (user?.teacherId) {
                where.teacherId = user.teacherId;
            }
        }
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { code: { contains: String(search), mode: "insensitive" } },
            ];
        }
        const subjects = await prisma_1.prisma.subject.findMany({
            where,
            include: { teacher: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        });
        const result = subjects.map((s) => ({
            id: s.id, code: s.code, name: s.name, gradeLevel: s.gradeLevel,
            hoursPerWeek: s.hoursPerWeek, teacherId: s.teacherId, teacherName: s.teacher.name,
        }));
        res.json({ success: true, data: result, total: result.length });
    }
    catch (error) {
        console.error("[Subjects] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(subjectSchema), async (req, res) => {
    try {
        const { code, name } = req.body;
        // Cek duplikasi kode
        const existingCode = await prisma_1.prisma.subject.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ success: false, message: `Gagal: Kode mapel "${code}" sudah digunakan.` });
        }
        // Cek duplikasi nama (optional but good)
        const existingName = await prisma_1.prisma.subject.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
        if (existingName) {
            return res.status(400).json({ success: false, message: `Gagal: Nama mapel "${name}" sudah terdaftar.` });
        }
        const subject = await prisma_1.prisma.subject.create({ data: req.body });
        res.status(201).json({ success: true, message: "Mata Pelajaran berhasil ditambahkan", data: subject });
    }
    catch (error) {
        console.error("[Subjects] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(subjectSchema.partial()), async (req, res) => {
    try {
        const subject = await prisma_1.prisma.subject.update({ where: { id: Number(req.params.id) }, data: req.body });
        res.json({ message: "Mapel berhasil diperbarui", data: subject });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ message: "Mapel tidak ditemukan" });
            return;
        }
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
// DELETE /api/subjects/:id
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Safe Delete: Cek relasi dengan Jadwal dan Nilai
        const [hasSchedules, hasGrades] = await Promise.all([
            prisma_1.prisma.schedule.findFirst({ where: { subjectId: id } }),
            prisma_1.prisma.grade.findFirst({ where: { subjectId: id } }),
        ]);
        if (hasSchedules || hasGrades) {
            return res.status(400).json({
                success: false,
                message: "Tidak dapat menghapus mata pelajaran: Masih terdapat data Jadwal atau Nilai yang terikat dengan mapel ini."
            });
        }
        await prisma_1.prisma.subject.delete({ where: { id } });
        res.json({ success: true, message: "Mapel berhasil dihapus" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Mapel tidak ditemukan" });
            return;
        }
        console.error("[Subjects] DELETE error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=subjects.route.js.map