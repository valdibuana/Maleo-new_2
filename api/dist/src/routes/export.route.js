"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const attendance_export_service_1 = require("../services/attendance-export.service");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Helper function untuk konversi tanggal ke minggu (M-1 sampai M-4)
function getWeekNumber(date) {
    const day = date.getDate();
    if (day <= 7)
        return 1;
    if (day <= 14)
        return 2;
    if (day <= 21)
        return 3;
    return 4;
}
/**
 * Export Student Attendance Excel
 * GET /api/export/attendance/student?classId=1&startDate=2026-01-01&endDate=2026-01-31
 */
router.get('/attendance/student', auth_1.verifyJWT, async (req, res) => {
    try {
        const { classId, startDate, endDate } = req.query;
        // Validation
        if (!classId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Parameter classId, startDate, dan endDate wajib diisi'
            });
        }
        console.log('[EXPORT] Student attendance request:', { classId, startDate, endDate });
        // Get class info
        const classData = await prisma_1.prisma.class.findUnique({
            where: { id: Number(classId) },
            select: { name: true, level: true }
        });
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan'
            });
        }
        // Get students in class
        const students = await prisma_1.prisma.student.findMany({
            where: { classId: Number(classId) },
            select: { id: true, nis: true, name: true },
            orderBy: { name: 'asc' }
        });
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada siswa di kelas ini'
            });
        }
        // Get attendance data
        const attendances = await prisma_1.prisma.attendance.findMany({
            where: {
                studentId: { in: students.map(s => s.id) },
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            select: { studentId: true, status: true }
        });
        console.log('[EXPORT] Found attendances:', attendances.length);
        // Aggregate by student
        const studentMap = new Map(students.map(s => [s.id, {
                no: 0,
                nis: s.nis,
                name: s.name,
                hadir: 0,
                sakit: 0,
                izin: 0,
                alpa: 0
            }]));
        attendances.forEach(att => {
            const student = studentMap.get(att.studentId);
            if (student) {
                student[att.status]++;
            }
        });
        const data = Array.from(studentMap.values()).map((s, idx) => ({
            ...s,
            no: idx + 1
        }));
        // Generate Excel
        const buffer = await attendance_export_service_1.AttendanceExportService.generateStudentAttendanceExcel(classData.name, startDate, endDate, data);
        console.log('[EXPORT] Excel generated, size:', buffer.length, 'bytes');
        // Set headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Rekap_Siswa_${classData.name}_${Date.now()}.xlsx"`);
        res.send(buffer);
    }
    catch (error) {
        console.error('[EXPORT] Student attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal generate Excel: ' + error.message
        });
    }
});
/**
 * Export Teacher Attendance Excel
 * GET /api/export/attendance/teacher?month=1&year=2026
 */
router.get('/attendance/teacher', auth_1.verifyJWT, async (req, res) => {
    try {
        const { month, year } = req.query;
        // Validation
        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Parameter month dan year wajib diisi'
            });
        }
        const monthIndex = parseInt(month) - 1; // 0-based (0 = January)
        const yearNum = parseInt(year);
        if (monthIndex < 0 || monthIndex > 11) {
            return res.status(400).json({
                success: false,
                message: 'Month harus antara 1-12'
            });
        }
        console.log('[EXPORT] Teacher attendance request:', { month, year });
        // Get active academic year for semester
        const activeYear = await prisma_1.prisma.academicYear.findFirst({
            where: { isActive: true },
            select: { semester: true }
        });
        // Get teacher attendances for the month
        const attendances = await prisma_1.prisma.teacherAttendance.findMany({
            where: {
                date: {
                    gte: new Date(yearNum, monthIndex, 1),
                    lt: new Date(yearNum, monthIndex + 1, 1)
                },
                status: 'hadir' // Only count present days
            },
            include: {
                teacher: {
                    include: {
                        teacherSubjects: {
                            where: { isPrimary: true },
                            include: { subject: true },
                            take: 1
                        }
                    }
                }
            }
        });
        console.log('[EXPORT] Found teacher attendances:', attendances.length);
        // Group by teacher and week
        const teacherMap = new Map();
        attendances.forEach(att => {
            const teacherId = att.teacherId;
            if (!teacherMap.has(teacherId)) {
                // Get primary subject or first subject
                let subjectName = 'Umum';
                if (att.teacher.teacherSubjects.length > 0) {
                    subjectName = att.teacher.teacherSubjects[0].subject.name;
                }
                teacherMap.set(teacherId, {
                    no: 0,
                    nama: att.teacher.name,
                    mapel: subjectName,
                    m1: 0,
                    m2: 0,
                    m3: 0,
                    m4: 0
                });
            }
            const week = getWeekNumber(att.date);
            const teacher = teacherMap.get(teacherId);
            teacher[`m${week}`]++;
        });
        // If no teachers found, get all teachers anyway (show 0 attendance)
        if (teacherMap.size === 0) {
            const allTeachers = await prisma_1.prisma.teacher.findMany({
                where: { status: 'active' },
                include: {
                    teacherSubjects: {
                        where: { isPrimary: true },
                        include: { subject: true },
                        take: 1
                    }
                },
                take: 20 // Limit to first 20 teachers
            });
            allTeachers.forEach(teacher => {
                const subjectName = teacher.teacherSubjects[0]?.subject.name || 'Umum';
                teacherMap.set(teacher.id, {
                    no: 0,
                    nama: teacher.name,
                    mapel: subjectName,
                    m1: 0,
                    m2: 0,
                    m3: 0,
                    m4: 0
                });
            });
        }
        const data = Array.from(teacherMap.values()).map((t, idx) => ({
            ...t,
            no: idx + 1,
            m1: t.m1 || '',
            m2: t.m2 || '',
            m3: t.m3 || '',
            m4: t.m4 || ''
        }));
        // Get month name
        const monthNames = [
            'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
            'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
        ];
        // Generate Excel
        const buffer = await attendance_export_service_1.AttendanceExportService.generateTeacherAttendanceExcel(monthNames[monthIndex], yearNum, activeYear?.semester || 'Ganjil', data);
        console.log('[EXPORT] Excel generated, size:', buffer.length, 'bytes');
        // Set headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Rekap_Tutor_${monthNames[monthIndex]}_${yearNum}.xlsx"`);
        res.send(buffer);
    }
    catch (error) {
        console.error('[EXPORT] Teacher attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal generate Excel: ' + error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=export.route.js.map