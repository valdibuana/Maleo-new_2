"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
// ──────────────────────────────────────────────
// GET /api/recycle-bin
// Akses: Admin
// ──────────────────────────────────────────────
router.get("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const { type } = req.query;
        if (!type || !["student", "teacher", "guardian", "class", "subject"].includes(String(type))) {
            return res.status(400).json({ success: false, message: "Tipe data tidak valid" });
        }
        let data = [];
        if (type === "student") {
            data = await prisma_1.prisma.student.findMany({
                where: { deletedAt: { not: null } },
                include: { class: { select: { name: true } } },
                orderBy: { deletedAt: "desc" }
            });
        }
        else if (type === "teacher") {
            data = await prisma_1.prisma.teacher.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" }
            });
        }
        else if (type === "guardian") {
            data = await prisma_1.prisma.guardian.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" }
            });
        }
        else if (type === "class") {
            data = await prisma_1.prisma.class.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" }
            });
        }
        else if (type === "subject") {
            data = await prisma_1.prisma.subject.findMany({
                where: { deletedAt: { not: null } },
                orderBy: { deletedAt: "desc" }
            });
        }
        res.json({
            success: true,
            data,
            meta: {
                note: "Data di Recycle Bin tidak dihapus otomatis. Lakukan Permanent Delete secara manual untuk data yang sudah tidak diperlukan.",
                totalItems: data.length
            }
        });
    }
    catch (error) {
        console.error("[Recycle Bin] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// ──────────────────────────────────────────────
// PUT /api/recycle-bin/:type/:id/restore
// Akses: Admin
// ──────────────────────────────────────────────
router.put("/:type/:id/restore", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const { type, id } = req.params;
        const numericId = Number(id);
        if (type === "student") {
            await prisma_1.prisma.student.update({ where: { id: numericId }, data: { deletedAt: null } });
        }
        else if (type === "teacher") {
            await prisma_1.prisma.teacher.update({ where: { id: numericId }, data: { deletedAt: null, status: "active" } });
        }
        else if (type === "guardian") {
            await prisma_1.prisma.guardian.update({ where: { id: numericId }, data: { deletedAt: null } });
        }
        else if (type === "class") {
            await prisma_1.prisma.class.update({ where: { id: numericId }, data: { deletedAt: null } });
        }
        else if (type === "subject") {
            await prisma_1.prisma.subject.update({ where: { id: numericId }, data: { deletedAt: null } });
        }
        else {
            return res.status(400).json({ success: false, message: "Tipe data tidak valid" });
        }
        res.json({ success: true, message: "Data berhasil dipulihkan." });
    }
    catch (error) {
        console.error("[Recycle Bin] Restore error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat memulihkan data" });
    }
});
// ──────────────────────────────────────────────
// DELETE /api/recycle-bin/:type/:id/permanent
// Akses: Admin
// ──────────────────────────────────────────────
router.delete("/:type/:id/permanent", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        const { type, id } = req.params;
        const numericId = Number(id);
        const { confirmText } = req.body;
        if (confirmText !== "HAPUS PERMANEN") {
            return res.status(400).json({ success: false, message: "Teks konfirmasi tidak valid." });
        }
        // FK Checks before permanent delete
        if (type === "student") {
            const relatedData = await prisma_1.prisma.attendance.count({ where: { studentId: numericId } });
            const relatedGrades = await prisma_1.prisma.grade.count({ where: { studentId: numericId } });
            if (relatedData > 0 || relatedGrades > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Tidak bisa hapus permanen: siswa ini masih punya ${relatedData} record kehadiran dan ${relatedGrades} nilai. Hubungi developer untuk hapus data terkait terlebih dahulu.`
                });
            }
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.user.deleteMany({ where: { studentId: numericId } });
                await tx.student.delete({ where: { id: numericId } });
            });
        }
        else if (type === "teacher") {
            const hasSubjects = await prisma_1.prisma.subject.count({ where: { teacherId: numericId } });
            const hasSchedules = await prisma_1.prisma.schedule.count({ where: { teacherId: numericId } });
            const hasHomeroom = await prisma_1.prisma.class.count({ where: { homeroomTeacherId: numericId } });
            if (hasSubjects > 0 || hasSchedules > 0 || hasHomeroom > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Tidak bisa hapus permanen: guru masih terikat pada mapel, jadwal, atau wali kelas."
                });
            }
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.user.deleteMany({ where: { teacherId: numericId } });
                await tx.teacher.delete({ where: { id: numericId } });
            });
        }
        else if (type === "guardian") {
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.user.deleteMany({ where: { guardianId: numericId } });
                await tx.guardian.delete({ where: { id: numericId } });
            });
        }
        else if (type === "class") {
            const studentCount = await prisma_1.prisma.student.count({ where: { classId: numericId } });
            const scheduleCount = await prisma_1.prisma.schedule.count({ where: { classId: numericId } });
            if (studentCount > 0 || scheduleCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Tidak bisa hapus permanen: kelas masih memiliki siswa atau jadwal."
                });
            }
            await prisma_1.prisma.class.delete({ where: { id: numericId } });
        }
        else if (type === "subject") {
            const scheduleCount = await prisma_1.prisma.schedule.count({ where: { subjectId: numericId } });
            const gradeCount = await prisma_1.prisma.grade.count({ where: { subjectId: numericId } });
            if (scheduleCount > 0 || gradeCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Tidak bisa hapus permanen: mapel masih memiliki jadwal atau nilai."
                });
            }
            await prisma_1.prisma.subject.delete({ where: { id: numericId } });
        }
        else {
            return res.status(400).json({ success: false, message: "Tipe data tidak valid" });
        }
        res.json({ success: true, message: "Data berhasil dihapus permanen." });
    }
    catch (error) {
        console.error("[Recycle Bin] Permanent Delete error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat menghapus permanen." });
    }
});
exports.default = router;
//# sourceMappingURL=recycle-bin.route.js.map