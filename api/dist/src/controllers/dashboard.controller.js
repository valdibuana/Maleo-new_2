"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = void 0;
const prisma_1 = require("../lib/prisma");
const getDashboardSummary = async (req, res) => {
    try {
        // 1. Counts
        const [totalStudents, totalTeachers, totalClasses, totalSubjects] = await Promise.all([
            prisma_1.prisma.student.count(),
            prisma_1.prisma.teacher.count(),
            prisma_1.prisma.class.count(),
            prisma_1.prisma.subject.count(),
        ]);
        // 2. Attendance Average
        const attendanceStats = await prisma_1.prisma.attendance.aggregate({
            _count: { id: true },
        });
        const presentCount = await prisma_1.prisma.attendance.count({
            where: { status: "hadir" }
        });
        const attendanceRate = attendanceStats._count.id > 0
            ? (presentCount / attendanceStats._count.id) * 100
            : 0;
        // 3. Academic Year
        const activeAcademicYear = await prisma_1.prisma.academicYear.findFirst({
            where: { isActive: true }
        });
        // 4. Recent Announcements
        const recentAnnouncements = await prisma_1.prisma.announcement.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: "desc" },
            take: 4
        });
        // 5. Attendance Chart — 6 bulan terakhir per bulan
        const MONTH_NAMES_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const now = new Date();
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const [hadir, izin, sakit, alpa] = await Promise.all([
                prisma_1.prisma.attendance.count({ where: { date: { gte: start, lte: end }, status: "hadir" } }),
                prisma_1.prisma.attendance.count({ where: { date: { gte: start, lte: end }, status: "izin" } }),
                prisma_1.prisma.attendance.count({ where: { date: { gte: start, lte: end }, status: "sakit" } }),
                prisma_1.prisma.attendance.count({ where: { date: { gte: start, lte: end }, status: "alpa" } }),
            ]);
            const total = hadir + izin + sakit + alpa;
            chartData.push({
                month: MONTH_NAMES_ID[d.getMonth()],
                hadir: total > 0 ? Math.round((hadir / total) * 100) : 0,
                izin: total > 0 ? Math.round((izin / total) * 100) : 0,
                sakit: total > 0 ? Math.round((sakit / total) * 100) : 0,
                alpa: total > 0 ? Math.round((alpa / total) * 100) : 0,
            });
        }
        res.json({
            success: true,
            data: {
                totalStudents,
                totalTeachers,
                totalClasses,
                totalSubjects,
                attendanceRate: parseFloat(attendanceRate.toFixed(1)),
                academicYear: activeAcademicYear?.name || "N/A",
                recentAnnouncements,
                attendanceChart: chartData,
            }
        });
    }
    catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data dashboard" });
    }
};
exports.getDashboardSummary = getDashboardSummary;
//# sourceMappingURL=dashboard.controller.js.map