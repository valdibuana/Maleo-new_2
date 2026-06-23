"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────────────────
// GET /api/principal/summary
// Hanya kepala_sekolah dan admin yang boleh akses
// ─────────────────────────────────────────────────────────
router.get("/summary", auth_1.verifyJWT, (0, role_1.checkRole)("kepala_sekolah", "admin"), async (req, res) => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [totalStudents, totalTeachers, totalClasses, totalSubjects, activeYear, recentAnnouncements, topStudentsRaw, totalAttendances, hadirCount, avgScore,] = await Promise.all([
            prisma_1.prisma.student.count({ where: { status: "active" } }),
            prisma_1.prisma.teacher.count({ where: { status: "active" } }),
            prisma_1.prisma.class.count(),
            prisma_1.prisma.subject.count(),
            prisma_1.prisma.academicYear.findFirst({ where: { isActive: true } }),
            prisma_1.prisma.announcement.findMany({
                where: { isPublished: true },
                orderBy: { createdAt: "desc" },
                take: 3,
            }),
            // Top 4 siswa berdasarkan rata-rata nilai
            prisma_1.prisma.grade.groupBy({
                by: ["studentId"],
                _avg: { score: true },
                orderBy: { _avg: { score: "desc" } },
                take: 4,
            }),
            // Attendance count bulan ini
            prisma_1.prisma.attendance.count({
                where: { date: { gte: startOfMonth } },
            }),
            // Hadir count bulan ini
            prisma_1.prisma.attendance.count({
                where: { date: { gte: startOfMonth }, status: "hadir" },
            }),
            // Rata-rata nilai global
            prisma_1.prisma.grade.aggregate({ _avg: { score: true } }),
        ]);
        // Attendance rate global
        const attendanceRate = totalAttendances > 0
            ? Math.round((hadirCount / totalAttendances) * 100)
            : 0;
        // Format topStudents dengan nama + kelas
        const topStudents = await Promise.all(topStudentsRaw.map(async (g) => {
            const student = await prisma_1.prisma.student.findUnique({
                where: { id: g.studentId },
                select: { name: true, class: { select: { name: true } } },
            });
            return {
                name: student?.name ?? "—",
                className: student?.class?.name ?? "—",
                avgScore: Math.round((g._avg.score || 0) * 10) / 10,
            };
        }));
        // Kehadiran per kelas bulan ini
        const attendancesByClass = await prisma_1.prisma.attendance.findMany({
            where: { date: { gte: startOfMonth } },
            include: {
                student: { select: { class: { select: { name: true } } } },
            },
        });
        // Group kehadiran per kelas
        const classMap = {};
        for (const a of attendancesByClass) {
            const className = a.student?.class?.name ?? "Unknown";
            if (!classMap[className]) {
                classMap[className] = { present: 0, total: 0 };
            }
            classMap[className].total++;
            if (a.status === "hadir")
                classMap[className].present++;
        }
        const attendanceByClass = Object.entries(classMap).map(([className, val]) => ({
            className,
            rate: Math.round((val.present / val.total) * 100),
            presentDays: val.present,
            totalDays: val.total,
        }));
        const lowAttendanceAlert = attendanceByClass.filter((c) => c.rate < 80);
        // Data untuk guru
        const teacherAttendanceThisMonth = await prisma_1.prisma.teacherAttendance.findMany({
            where: { date: { gte: startOfMonth } }
        });
        const teacherHadirCount = teacherAttendanceThisMonth.filter(a => a.status === 'hadir' || a.status === 'terlambat').length;
        const teacherAttendanceRate = teacherAttendanceThisMonth.length > 0
            ? Math.round((teacherHadirCount / teacherAttendanceThisMonth.length) * 100)
            : 0;
        // Alert siswa berisiko (kehadiran < 75% bulan ini)
        const studentAttendanceByStudent = await prisma_1.prisma.attendance.groupBy({
            by: ['studentId'],
            where: { date: { gte: startOfMonth } },
            _count: { status: true },
        });
        const atRiskStudents = await Promise.all(studentAttendanceByStudent
            .filter(s => s._count.status > 0)
            .map(async (s) => {
            const hadir = await prisma_1.prisma.attendance.count({
                where: {
                    studentId: s.studentId,
                    date: { gte: startOfMonth },
                    status: 'hadir'
                }
            });
            const total = s._count.status;
            const rate = Math.round((hadir / total) * 100);
            if (rate < 75) {
                const student = await prisma_1.prisma.student.findUnique({
                    where: { id: s.studentId },
                    select: {
                        name: true,
                        class: { select: { name: true } },
                        guardians: { select: { name: true, phone: true } }
                    }
                });
                return {
                    studentId: s.studentId,
                    name: student?.name,
                    className: student?.class?.name,
                    attendanceRate: rate,
                    guardian: student?.guardians?.[0] || null,
                };
            }
            return null;
        }));
        const filteredAtRisk = atRiskStudents.filter(Boolean);
        res.json({
            success: true,
            data: {
                totalStudents,
                totalTeachers,
                totalClasses,
                totalSubjects,
                attendanceRate,
                averageScore: Math.round((avgScore._avg.score || 0) * 10) / 10,
                academicYear: activeYear
                    ? `${activeYear.name} - ${activeYear.semester}`
                    : "-",
                recentAnnouncements,
                topStudents,
                attendanceByClass,
                lowAttendanceAlert,
                teacherAttendanceRate,
                atRiskStudents: filteredAtRisk,
                atRiskCount: filteredAtRisk.length,
            },
        });
    }
    catch (error) {
        console.error("[Principal] GET summary error:", error);
        res
            .status(500)
            .json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// GET /api/principal/attendance-trend?months=6
router.get("/attendance-trend", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "kepala_sekolah" && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const monthsCount = Number(req.query.months) || 6;
        const now = new Date();
        const studentTrend = [];
        const teacherTrend = [];
        for (let i = monthsCount - 1; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            const monthLabel = startOfMonth.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
            // Kehadiran siswa per jenjang
            const levels = [7, 8, 9, 10, 11, 12];
            const monthData = { month: monthLabel };
            for (const level of levels) {
                const attendances = await prisma_1.prisma.attendance.findMany({
                    where: {
                        date: { gte: startOfMonth, lte: endOfMonth },
                        student: { class: { level } }
                    },
                    select: { status: true }
                });
                if (attendances.length === 0) {
                    monthData[String(level)] = null; // null = belum ada data, BUKAN 0
                }
                else {
                    const hadir = attendances.filter(a => a.status === "hadir").length;
                    monthData[String(level)] = Math.round((hadir / attendances.length) * 100);
                }
            }
            studentTrend.push(monthData);
            // Kehadiran guru bulan itu
            const teacherAttendances = await prisma_1.prisma.teacherAttendance.findMany({
                where: { date: { gte: startOfMonth, lte: endOfMonth } },
                select: { status: true }
            });
            const teacherRate = teacherAttendances.length > 0
                ? Math.round((teacherAttendances.filter(a => a.status === "hadir" || a.status === "terlambat").length / teacherAttendances.length) * 100)
                : null;
            teacherTrend.push({ month: monthLabel, rate: teacherRate });
        }
        res.json({ success: true, data: { studentTrend, teacherTrend } });
    }
    catch (error) {
        console.error("[Principal] Attendance trend error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data trend." });
    }
});
// GET /api/principal/grades-by-level
router.get("/grades-by-level", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "kepala_sekolah" && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const levels = [7, 8, 9, 10, 11, 12];
        const byLevel = [];
        for (const level of levels) {
            const studentCount = await prisma_1.prisma.student.count({
                where: { class: { level }, status: "active" }
            });
            const grades = await prisma_1.prisma.grade.findMany({
                where: { student: { class: { level } } },
                select: { score: true, maxScore: true }
            });
            const avgScore = grades.length > 0
                ? Math.round((grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0)
                    / grades.length) * 10) / 10
                : null;
            const levelLabel = ["VII", "VIII", "IX", "X", "XI", "XII"][levels.indexOf(level)];
            byLevel.push({ level, levelLabel, avgScore, studentCount });
        }
        res.json({ success: true, data: { byLevel } });
    }
    catch (error) {
        console.error("[Principal] Grades by level error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data nilai." });
    }
});
exports.default = router;
//# sourceMappingURL=principal.route.js.map