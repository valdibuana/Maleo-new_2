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
const pagination_1 = require("../lib/pagination");
const roles_1 = require("../lib/roles");
const fields_1 = require("../lib/fields");
const exceljs_1 = __importDefault(require("exceljs"));
const router = (0, express_1.Router)();
const attendanceSchema = zod_1.z.object({
    date: zod_1.z.string().min(1),
    status: zod_1.z.enum(["hadir", "izin", "sakit", "alpa"]),
    note: zod_1.z.string().optional().nullable(),
    studentId: zod_1.z.number().int().positive(),
});
const bulkSchema = zod_1.z.object({
    classId: zod_1.z.number().int().positive(),
    date: zod_1.z.string().min(1),
    records: zod_1.z.array(zod_1.z.object({
        studentId: zod_1.z.number().int().positive(),
        status: zod_1.z.enum(["hadir", "izin", "sakit", "alpa"]),
        note: zod_1.z.string().optional().nullable(),
    })),
});
// GET /api/attendances/by-class
router.get("/by-class", auth_1.verifyJWT, async (req, res) => {
    try {
        const { classId, date } = req.query;
        if (!classId || !date) {
            res.status(400).json({ success: false, message: "classId dan date diperlukan" });
            return;
        }
        const cId = Number(classId);
        const targetDate = new Date(String(date));
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);
        const students = await prisma_1.prisma.student.findMany({
            where: { classId: cId },
            include: {
                attendances: {
                    where: {
                        date: {
                            gte: targetDate,
                            lt: nextDay,
                        },
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        const results = students.map((s) => {
            const attendance = s.attendances[0]; // will be undefined if no record exists
            return {
                studentId: s.id,
                nis: s.nis,
                name: s.name,
                status: attendance ? attendance.status : "hadir", // Default to 'hadir'
                note: attendance ? attendance.note : "",
            };
        });
        res.json({ success: true, data: results });
    }
    catch (error) {
        console.error("[Attendances by-class] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// POST /api/attendances/bulk
router.post("/bulk", auth_1.verifyJWT, (0, role_1.checkRole)("admin", "teacher"), (0, validate_1.validate)(bulkSchema), async (req, res) => {
    try {
        const { classId, date, records } = req.body;
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);
        // Cek apakah data kehadiran sudah pernah diinput untuk tanggal dan kelas ini
        const existingRecord = await prisma_1.prisma.attendance.findFirst({
            where: {
                date: { gte: targetDate, lt: nextDay },
                student: { classId: classId },
            },
        });
        if (existingRecord) {
            res.status(400).json({
                success: false,
                message: "Data absensi untuk kelas dan tanggal ini sudah ada. Silakan gunakan fitur edit jika ingin mengubah.",
            });
            return;
        }
        const createData = records.map((record) => ({
            studentId: record.studentId,
            date: targetDate,
            status: record.status,
            note: record.note,
        }));
        await prisma_1.prisma.attendance.createMany({
            data: createData,
        });
        res.status(201).json({
            success: true,
            message: "Data absensi batch berhasil disimpan",
        });
    }
    catch (error) {
        console.error("[Attendances bulk] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// GET /api/attendances/export/excel — HARUS di atas GET / agar tidak di-shadow
router.get("/export/excel", auth_1.verifyJWT, async (req, res) => {
    try {
        const { classId, className, status, date, month, year } = req.query;
        const where = {};
        if (classId) {
            where.student = { classId: Number(classId) };
        }
        else if (className) {
            where.student = { class: { name: String(className) } };
        }
        if (status)
            where.status = String(status);
        if (date) {
            const targetDate = new Date(String(date));
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(targetDate.getDate() + 1);
            where.date = { gte: targetDate, lt: nextDay };
        }
        else if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        }
        const attendances = await prisma_1.prisma.attendance.findMany({
            where,
            include: {
                student: {
                    select: {
                        name: true,
                        nis: true,
                        class: { select: { name: true } },
                    },
                },
            },
            orderBy: [{ date: "desc" }, { student: { name: "asc" } }],
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Rekap Kehadiran");
        worksheet.columns = [
            { header: "No", key: "no", width: 5 },
            { header: "Nama Siswa", key: "studentName", width: 30 },
            { header: "NIS", key: "nis", width: 15 },
            { header: "Kelas", key: "className", width: 15 },
            { header: "Tanggal", key: "date", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Keterangan", key: "note", width: 25 },
        ];
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        attendances.forEach((att, index) => {
            const d = att.date;
            const formattedDate = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
            worksheet.addRow({
                no: index + 1,
                studentName: att.student.name,
                nis: att.student.nis,
                className: att.student.class.name,
                date: formattedDate,
                status: att.status.toUpperCase(),
                note: att.note || "-",
            });
        });
        const fileName = date
            ? `Rekap_Kehadiran_${date}.xlsx`
            : month && year
                ? `Rekap_Kehadiran_${year}_${String(month).padStart(2, "0")}.xlsx`
                : "Rekap_Kehadiran_Semua.xlsx";
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error("[Attendances] Export error:", error);
        res.status(500).json({ success: false, message: "Gagal export Excel" });
    }
});
// GET /api/attendances — list dengan filter (role-based)
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        const { className, classId, status, date, search } = req.query;
        const where = {};
        // ── Role-based data filtering ──
        if (role === roles_1.ROLES.STUDENT) {
            const student = await prisma_1.prisma.student.findFirst({ where: { user: { id: userId } } });
            if (!student)
                return res.json({ success: true, data: [], total: 0 });
            where.studentId = student.id;
        }
        else if (role === roles_1.ROLES.GUARDIAN) {
            const guardian = await prisma_1.prisma.guardian.findFirst({
                where: { user: { id: userId } },
                include: { students: { select: { id: true } } },
            });
            const childIds = guardian?.students.map((s) => s.id) || [];
            if (childIds.length === 0)
                return res.json({ success: true, data: [], total: 0 });
            where.studentId = { in: childIds };
        }
        else if (role === roles_1.ROLES.TEACHER) {
            const teacher = await prisma_1.prisma.teacher.findFirst({
                where: { user: { id: userId } },
                include: { homeroomClasses: { select: { id: true } } },
            });
            if (!teacher)
                return res.json({ success: true, data: [], total: 0 });
            const classIds = teacher.homeroomClasses.map((c) => c.id);
            where.student = { classId: { in: classIds } };
        }
        // admin and kepala_sekolah: no role filter
        // Filter kelas — support by id atau by name
        if (classId) {
            where.student = { ...where.student, classId: Number(classId) };
        }
        else if (className) {
            where.student = { ...where.student, class: { name: String(className) } };
        }
        if (status)
            where.status = String(status);
        // FIX: gunakan range gte/lt bukan equality agar cocok dengan DateTime
        if (date) {
            const targetDate = new Date(String(date));
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(targetDate.getDate() + 1);
            where.date = { gte: targetDate, lt: nextDay };
        }
        if (search) {
            where.student = {
                ...where.student,
                name: { contains: String(search), mode: "insensitive" },
            };
        }
        const { page, limit, skip } = (0, pagination_1.parsePagination)(req.query);
        const [attendances, total] = await Promise.all([
            prisma_1.prisma.attendance.findMany({
                where,
                include: {
                    student: {
                        select: {
                            name: true,
                            nis: true,
                            class: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: { date: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.attendance.count({ where }),
        ]);
        const result = attendances.map((a) => ({
            id: a.id,
            studentId: a.studentId,
            studentName: a.student.name,
            studentNis: a.student.nis,
            className: a.student.class.name,
            classId: a.student.class.id,
            date: a.date.toISOString().split("T")[0],
            status: a.status,
            note: a.note,
        }));
        const fields = (0, fields_1.parseFields)(req.query);
        const filteredResult = (0, fields_1.selectFields)(result, fields);
        res.json({ success: true, data: filteredResult, pagination: (0, pagination_1.buildPagination)(page, limit, total) });
    }
    catch (error) {
        console.error("[Attendances] GET error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin", "teacher"), (0, validate_1.validate)(attendanceSchema), async (req, res) => {
    try {
        const data = req.body;
        const att = await prisma_1.prisma.attendance.create({
            data: { ...data, date: new Date(data.date) },
        });
        res.status(201).json({ success: true, message: "Kehadiran berhasil dicatat", data: att });
    }
    catch (error) {
        console.error("[Attendances] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin", "teacher"), (0, validate_1.validate)(attendanceSchema.partial()), async (req, res) => {
    try {
        const data = req.body;
        if (data.date)
            data.date = new Date(data.date);
        const att = await prisma_1.prisma.attendance.update({
            where: { id: Number(req.params.id) },
            data,
        });
        res.json({ success: true, message: "Kehadiran berhasil diperbarui", data: att });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Data tidak ditemukan" });
            return;
        }
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        await prisma_1.prisma.attendance.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: "Kehadiran berhasil dihapus" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Data tidak ditemukan" });
            return;
        }
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// Route export sudah dipindah ke atas GET / — lihat baris di atas
exports.default = router;
//# sourceMappingURL=attendances.route.js.map