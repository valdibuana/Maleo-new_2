"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware: ambil guardianId dari user yang login
const guardianGuard = async (req, res, next) => {
    try {
        if (req.user.role !== "guardian") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                guardian: {
                    include: {
                        students: {
                            select: {
                                id: true,
                                name: true,
                                nis: true,
                                classId: true,
                                class: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            }
        });
        if (!user?.guardian) {
            return res.status(404).json({ success: false, message: "Profil wali murid tidak ditemukan." });
        }
        req.guardian = user.guardian;
        req.guardianId = user.guardian.id;
        req.children = user.guardian.students; // array siswa
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan." });
    }
};
router.use(auth_1.verifyJWT);
router.use(guardianGuard);
// 1. GET /api/connect/dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const children = req.children;
        const activeYear = await prisma_1.prisma.academicYear.findFirst({
            where: { isActive: true }
        });
        const announcements = await prisma_1.prisma.announcement.findMany({
            where: {
                isPublished: true,
                OR: [{ target: "all" }, { target: "guardian" }]
            },
            orderBy: { createdAt: "desc" },
            take: 5
        });
        // Data per anak
        const childrenData = await Promise.all(children.map(async (child) => {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const [attendances, grades, activeAssignments] = await Promise.all([
                prisma_1.prisma.attendance.findMany({
                    where: { studentId: child.id, date: { gte: startOfMonth } }
                }),
                prisma_1.prisma.grade.findMany({
                    where: { studentId: child.id },
                    include: { subject: { select: { name: true } } }
                }),
                prisma_1.prisma.assignment.count({
                    where: { classId: child.classId, dueDate: { gte: new Date() } }
                })
            ]);
            const hadirCount = attendances.filter((a) => a.status === "hadir").length;
            const attendanceRate = attendances.length > 0
                ? Math.round((hadirCount / attendances.length) * 100)
                : 0;
            const avgGrade = grades.length > 0
                ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
                : 0;
            return {
                ...child,
                attendanceRate,
                avgGrade,
                activeAssignments,
                totalAttendances: attendances.length,
            };
        }));
        res.json({
            success: true,
            data: {
                guardian: {
                    id: req.guardian.id,
                    name: req.guardian.name,
                },
                children: childrenData,
                totalChildren: children.length,
                academicYear: activeYear
                    ? `${activeYear.name} - ${activeYear.semester}`
                    : "-",
                announcements,
                unreadAnnouncements: announcements.length,
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil data dashboard." });
    }
});
// 2. GET /api/connect/children
// → list semua anak yang terhubung
router.get("/children", async (req, res) => {
    try {
        res.json({ success: true, data: req.children });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil data anak." });
    }
});
// 3. GET /api/connect/child/:studentId/attendance
// → kehadiran anak bulan ini
router.get("/child/:studentId/attendance", async (req, res) => {
    try {
        // Validasi: pastikan siswa ini memang anak dari guardian yang login
        const isMyChild = req.children.some((c) => c.id === Number(req.params.studentId));
        if (!isMyChild) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke data siswa ini."
            });
        }
        const { month, year } = req.query;
        const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
        const targetYear = year ? Number(year) : new Date().getFullYear();
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0);
        const attendances = await prisma_1.prisma.attendance.findMany({
            where: {
                studentId: Number(req.params.studentId),
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: "desc" }
        });
        const summary = {
            hadir: attendances.filter((a) => a.status === "hadir").length,
            izin: attendances.filter((a) => a.status === "izin").length,
            sakit: attendances.filter((a) => a.status === "sakit").length,
            alpa: attendances.filter((a) => a.status === "alpa").length,
            total: attendances.length,
            rate: attendances.length > 0
                ? Math.round((attendances.filter((a) => a.status === "hadir").length / attendances.length) * 100)
                : 0
        };
        res.json({ success: true, data: { attendances, summary } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil data kehadiran." });
    }
});
// 4. GET /api/connect/child/:studentId/grades
// → nilai anak per mata pelajaran
router.get("/child/:studentId/grades", async (req, res) => {
    try {
        const isMyChild = req.children.some((c) => c.id === Number(req.params.studentId));
        if (!isMyChild) {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const grades = await prisma_1.prisma.grade.findMany({
            where: { studentId: Number(req.params.studentId) },
            include: { subject: { select: { name: true } } },
            orderBy: { date: "desc" }
        });
        // Group per mata pelajaran
        const grouped = grades.reduce((acc, grade) => {
            const subjectName = grade.subject.name;
            // eslint-disable-next-line security/detect-object-injection
            if (!acc[subjectName]) {
                // eslint-disable-next-line security/detect-object-injection
                acc[subjectName] = { subject: subjectName, grades: [], avg: 0 };
            }
            // eslint-disable-next-line security/detect-object-injection
            acc[subjectName].grades.push(grade);
            return acc;
        }, {});
        // Hitung rata-rata per mapel
        Object.keys(grouped).forEach(key => {
            // eslint-disable-next-line security/detect-object-injection
            const g = grouped[key].grades;
            // eslint-disable-next-line security/detect-object-injection
            grouped[key].avg = Math.round(g.reduce((sum, gr) => sum + gr.score, 0) / g.length);
        });
        res.json({
            success: true,
            data: Object.values(grouped)
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil data nilai." });
    }
});
// 5. GET /api/connect/child/:studentId/assignments
// → tugas anak yang aktif
router.get("/child/:studentId/assignments", async (req, res) => {
    try {
        const isMyChild = req.children.some((c) => c.id === Number(req.params.studentId));
        if (!isMyChild) {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const child = req.children.find((c) => c.id === Number(req.params.studentId));
        const assignments = await prisma_1.prisma.assignment.findMany({
            where: { classId: child.classId },
            include: {
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                class: { select: { name: true } }
            },
            orderBy: { dueDate: "asc" }
        });
        res.json({ success: true, data: assignments });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil data tugas." });
    }
});
// 6. GET /api/connect/consultations
// → list semua thread konsultasi wali murid ini
router.get("/consultations", async (req, res) => {
    try {
        const consultations = await prisma_1.prisma.consultation.findMany({
            where: {
                parentId: null, // hanya thread utama
                OR: [
                    { senderId: req.user.id },
                    { receiverId: req.user.id }
                ]
            },
            include: {
                replies: {
                    orderBy: { createdAt: "asc" },
                    take: 1 // preview reply terakhir
                },
                _count: { select: { replies: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ success: true, data: consultations });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil konsultasi." });
    }
});
// 7. GET /api/connect/consultations/:id
// → detail thread konsultasi + semua reply
router.get("/consultations/:id", async (req, res) => {
    try {
        const consultation = await prisma_1.prisma.consultation.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                replies: { orderBy: { createdAt: "asc" } }
            }
        });
        if (!consultation) {
            return res.status(404).json({ success: false, message: "Konsultasi tidak ditemukan." });
        }
        // Validasi akses
        if (consultation.senderId !== req.user.id &&
            consultation.receiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        // Mark as read
        if (consultation.receiverId === req.user.id) {
            await prisma_1.prisma.consultation.update({
                where: { id: Number(req.params.id) },
                data: { status: "read" }
            });
        }
        res.json({ success: true, data: consultation });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil detail konsultasi." });
    }
});
// 8. POST /api/connect/consultations
// → wali murid mulai thread konsultasi baru ke guru
router.post("/consultations", async (req, res) => {
    try {
        const { receiverId, subject, message } = req.body;
        if (!receiverId || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "receiverId, subject, dan message wajib diisi."
            });
        }
        // Validasi receiver adalah guru
        const receiver = await prisma_1.prisma.user.findUnique({
            where: { id: Number(receiverId) }
        });
        if (!receiver || receiver.role !== "teacher") {
            return res.status(400).json({
                success: false,
                message: "Penerima harus seorang guru."
            });
        }
        const consultation = await prisma_1.prisma.consultation.create({
            data: {
                senderId: req.user.id,
                receiverId: Number(receiverId),
                senderRole: "guardian",
                subject,
                message,
                status: "unread"
            }
        });
        res.status(201).json({
            success: true,
            message: "Konsultasi berhasil dikirim.",
            data: consultation
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengirim konsultasi." });
    }
});
// 9. POST /api/connect/consultations/:id/reply
// → wali murid reply ke thread
router.post("/consultations/:id/reply", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: "Pesan tidak boleh kosong." });
        }
        const parent = await prisma_1.prisma.consultation.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!parent) {
            return res.status(404).json({ success: false, message: "Thread tidak ditemukan." });
        }
        // Pastikan wali murid ini adalah bagian dari thread
        if (parent.senderId !== req.user.id &&
            parent.receiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        // Tentukan receiverId = pihak lain dalam thread
        const receiverId = parent.senderId === req.user.id
            ? parent.receiverId
            : parent.senderId;
        const reply = await prisma_1.prisma.consultation.create({
            data: {
                senderId: req.user.id,
                receiverId,
                senderRole: "guardian",
                subject: parent.subject,
                message,
                parentId: parent.id,
                status: "unread"
            }
        });
        // Update status parent ke "replied"
        await prisma_1.prisma.consultation.update({
            where: { id: parent.id },
            data: { status: "replied" }
        });
        res.status(201).json({
            success: true,
            message: "Balasan berhasil dikirim.",
            data: reply
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengirim balasan." });
    }
});
// 10. GET /api/connect/teachers
// → list guru yang bisa dikonsultasi
router.get("/teachers", async (req, res) => {
    try {
        // Ambil guru yang mengajar kelas anak-anak guardian ini
        const classIds = req.children.map((c) => c.classId);
        // STRATEGY: Try schedule-based first, fallback to all active teachers
        let teachers = [];
        // Method 1: From schedules (most specific)
        const schedules = await prisma_1.prisma.schedule.findMany({
            where: { classId: { in: classIds } },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: { id: true }
                        }
                    }
                },
                subject: { select: { name: true } },
                class: { select: { name: true } }
            }
        });
        if (schedules.length > 0) {
            // Group by teacher to avoid duplicates
            const teacherMap = new Map();
            schedules.forEach(schedule => {
                const teacherId = schedule.teacher.id;
                if (!teacherMap.has(teacherId)) {
                    teacherMap.set(teacherId, {
                        id: schedule.teacher.id,
                        name: schedule.teacher.name,
                        phone: schedule.teacher.phone,
                        userId: schedule.teacher.user?.id,
                        subject: schedule.subject.name,
                        class: schedule.class.name,
                        subjects: [schedule.subject.name],
                        classes: [schedule.class.name]
                    });
                }
                else {
                    // Add additional subjects/classes
                    const teacher = teacherMap.get(teacherId);
                    if (!teacher.subjects.includes(schedule.subject.name)) {
                        teacher.subjects.push(schedule.subject.name);
                    }
                    if (!teacher.classes.includes(schedule.class.name)) {
                        teacher.classes.push(schedule.class.name);
                    }
                    teacher.subject = teacher.subjects.join(", ");
                    teacher.class = teacher.classes.join(", ");
                }
            });
            teachers = Array.from(teacherMap.values()).filter(t => t.userId);
        }
        // Method 2: Fallback - Get all active teachers with user accounts
        if (teachers.length === 0) {
            console.log("[Connect] No schedule-based teachers found, using fallback: all active teachers");
            const allTeachers = await prisma_1.prisma.teacher.findMany({
                where: {
                    status: "active",
                    user: {
                        isNot: null
                    }
                },
                include: {
                    user: {
                        select: { id: true }
                    },
                    teacherSubjects: {
                        include: {
                            subject: {
                                select: { name: true }
                            }
                        },
                        where: {
                            isPrimary: true
                        },
                        take: 1
                    }
                }
            });
            teachers = allTeachers.map(t => ({
                id: t.id,
                name: t.name,
                email: t.email,
                userId: t.user?.id,
                subject: t.teacherSubjects[0]?.subject.name || t.subject || "Guru",
                class: "Semua Kelas"
            }));
        }
        res.json({ success: true, data: teachers });
    }
    catch (error) {
        console.error("[Connect] Error fetching teachers:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data guru." });
    }
});
exports.default = router;
//# sourceMappingURL=connect.route.js.map