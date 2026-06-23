"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const scheduleSchema = zod_1.z.object({
    day: zod_1.z.string().min(1, "Hari wajib diisi"),
    startTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
    endTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
    room: zod_1.z.string().min(1, "Ruangan wajib diisi"),
    subjectId: zod_1.z.coerce.number().int().positive("Mata Pelajaran harus dipilih"),
    teacherId: zod_1.z.coerce.number().int().positive("Guru harus dipilih"),
    classId: zod_1.z.coerce.number().int().positive("Kelas harus dipilih"),
});
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { className } = req.query;
        const where = {};
        if (className)
            where.class = { name: String(className) };
        const schedules = await prisma_1.prisma.schedule.findMany({
            where,
            include: {
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                class: { select: { name: true } },
            },
            orderBy: [{ day: "asc" }, { startTime: "asc" }],
        });
        const result = schedules.map((s) => ({
            id: s.id,
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            subjectName: s.subject.name,
            teacherName: s.teacher.name,
            className: s.class.name,
        }));
        res.json({ success: true, data: result, total: result.length });
    }
    catch (error) {
        console.error("[Schedules] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(scheduleSchema), async (req, res) => {
    try {
        const schedule = await prisma_1.prisma.schedule.create({ data: req.body });
        res.status(201).json({ success: true, message: "Jadwal berhasil ditambahkan", data: schedule });
    }
    catch (error) {
        console.error("[Schedules] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(scheduleSchema.partial()), async (req, res) => {
    try {
        const schedule = await prisma_1.prisma.schedule.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json({ success: true, message: "Jadwal berhasil diperbarui", data: schedule });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
            return;
        }
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        await prisma_1.prisma.schedule.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: "Jadwal berhasil dihapus" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
            return;
        }
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=schedules.route.js.map