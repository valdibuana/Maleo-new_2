"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ── Jam kerja standar sekolah (V1: fixed, V2: configurable per-sekolah) ──
const WORK_START_HOUR = 7;
const WORK_START_MINUTE = 0;
const WORK_START_TIME = '07:00';
// ──────────────────────────────────────────────
// GET /today — Status check-in hari ini (guru)
// ──────────────────────────────────────────────
router.get("/today", auth_1.verifyJWT, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        // Fix Bug 4: 1 query saja via relasi langsung User → Teacher
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { teacher: true }
        });
        if (!user?.teacher) {
            return res.status(404).json({
                success: false,
                message: "Data guru tidak ditemukan. Pastikan akun Anda terhubung ke profil guru."
            });
        }
        const teacher = user.teacher;
        // Fix Bug 8: Cek apakah guru punya jadwal hari ini
        const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][now.getDay()];
        const [existing, hasScheduleToday, monthlyAttendances] = await Promise.all([
            prisma_1.prisma.teacherAttendance.findUnique({
                where: { teacherId_date: { teacherId: teacher.id, date: today } }
            }),
            prisma_1.prisma.schedule.count({
                where: { teacherId: teacher.id, day: dayName }
            }),
            // Monthly summary: ambil semua attendance bulan berjalan
            prisma_1.prisma.teacherAttendance.findMany({
                where: {
                    teacherId: teacher.id,
                    date: {
                        gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                    }
                },
                select: { status: true }
            })
        ]);
        // Hitung monthly summary
        const monthlySummary = {
            present: monthlyAttendances.filter(a => a.status === 'hadir').length,
            late: monthlyAttendances.filter(a => a.status === 'terlambat').length,
            absent: monthlyAttendances.filter(a => a.status === 'alpa').length,
            permission: monthlyAttendances.filter(a => a.status === 'izin').length,
            sick: monthlyAttendances.filter(a => a.status === 'sakit').length,
        };
        // Generate friendly message
        let message;
        if (existing) {
            if (existing.status === 'hadir') {
                message = 'Terima kasih. Anda hadir tepat waktu hari ini.';
            }
            else if (existing.status === 'terlambat') {
                message = `Anda melakukan check-in ${existing.lateMinutes || 0} menit setelah jam kerja dimulai.`;
            }
            else if (existing.status === 'izin') {
                message = 'Anda tercatat izin hari ini.';
            }
            else if (existing.status === 'sakit') {
                message = 'Semoga lekas sembuh. Anda tercatat sakit hari ini.';
            }
            else {
                message = 'Status kehadiran Anda telah tercatat.';
            }
        }
        else {
            message = 'Silakan lakukan check-in untuk mencatat kehadiran hari ini.';
        }
        res.json({
            success: true,
            data: {
                hasCheckedIn: !!existing,
                attendance: existing || null,
                isWindowOpen: true, // Maleo trust-based: check-in selalu terbuka 24/7
                currentTime: now.toISOString(),
                hasScheduleToday: hasScheduleToday > 0,
                warningMessage: hasScheduleToday === 0
                    ? "Anda tidak memiliki jadwal mengajar hari ini."
                    : null,
                // ── V1 Enhancement fields ──
                workStartTime: WORK_START_TIME,
                message,
                monthlySummary,
            }
        });
    }
    catch (error) {
        console.error('[TeacherAttendance] GET /today error:', error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ──────────────────────────────────────────────
// POST /checkin — Check-in mandiri guru
// ──────────────────────────────────────────────
router.post("/checkin", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "teacher") {
            return res.status(403).json({ success: false, message: "Hanya guru yang bisa check-in." });
        }
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        // Fix Bug 4: 1 query saja via relasi langsung User → Teacher
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { teacher: true }
        });
        if (!user?.teacher) {
            return res.status(404).json({
                success: false,
                message: "Data guru tidak ditemukan. Pastikan akun Anda terhubung ke profil guru."
            });
        }
        const teacher = user.teacher;
        // Cek apakah sudah check-in hari ini
        const existing = await prisma_1.prisma.teacherAttendance.findUnique({
            where: { teacherId_date: { teacherId: teacher.id, date: today } }
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Anda sudah melakukan check-in hari ini.",
                data: existing
            });
        }
        const { status, note } = req.body;
        // Hitung keterlambatan berdasarkan jam kerja standar sekolah
        const hour = now.getHours();
        const minute = now.getMinutes();
        const isLate = status === 'hadir' && (hour > WORK_START_HOUR ||
            (hour === WORK_START_HOUR && minute > WORK_START_MINUTE));
        const lateMinutes = isLate
            ? (hour - WORK_START_HOUR) * 60 + minute - WORK_START_MINUTE
            : 0;
        const finalStatus = status === 'hadir' && isLate ? 'terlambat' : status;
        // Sanitasi note: jika status 'hadir', paksa null agar data stale dari frontend tidak bocor
        const sanitizedNote = status === 'hadir' ? null : (note || null);
        const attendance = await prisma_1.prisma.teacherAttendance.create({
            data: {
                teacherId: teacher.id,
                date: today,
                status: finalStatus,
                checkinAt: now, // Timestamp server — tidak bisa dimanipulasi
                checkinType: 'self',
                note: sanitizedNote,
                isLate,
                lateMinutes: lateMinutes > 0 ? lateMinutes : null,
            }
        });
        res.status(201).json({
            success: true,
            message: isLate
                ? `Check-in berhasil. Terlambat ${lateMinutes} menit.`
                : "Check-in berhasil. Selamat bekerja!",
            data: attendance
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ──────────────────────────────────────────────
// Fix Bug 6: /export HARUS sebelum /:id
// Fix Bug 5: tambah verifyJWT + role check
// ──────────────────────────────────────────────
router.get("/export", auth_1.verifyJWT, async (req, res) => {
    try {
        // Fix Bug 5: hanya admin dan kepala sekolah yang bisa export
        if (req.user.role !== "admin" && req.user.role !== "kepala_sekolah") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const { month, year } = req.query;
        const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
        const targetYear = year ? Number(year) : new Date().getFullYear();
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0);
        const attendances = await prisma_1.prisma.teacherAttendance.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            include: {
                teacher: { select: { name: true, nip: true } }
            },
            orderBy: [{ date: 'asc' }, { teacher: { name: 'asc' } }]
        });
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Kehadiran Guru');
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Nama Guru', key: 'name', width: 30 },
            { header: 'NIP', key: 'nip', width: 20 },
            { header: 'Tanggal', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Jam Check-in', key: 'checkinAt', width: 15 },
            { header: 'Terlambat (menit)', key: 'lateMinutes', width: 18 },
            { header: 'Keterangan', key: 'note', width: 25 },
            { header: 'Tipe Input', key: 'checkinType', width: 15 },
            { header: 'Dioverride Oleh', key: 'overriddenBy', width: 20 },
            { header: 'Alasan Override', key: 'overrideReason', width: 30 },
        ];
        // Styling header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        attendances.forEach((a, i) => {
            const d = new Date(a.date);
            worksheet.addRow({
                no: i + 1,
                name: a.teacher.name,
                nip: a.teacher.nip,
                date: `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`,
                status: a.status.toUpperCase(),
                checkinAt: a.checkinAt
                    ? new Date(a.checkinAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '-',
                lateMinutes: a.lateMinutes || 0,
                note: a.note || '-',
                checkinType: a.checkinType === 'self' ? 'Mandiri' : 'Admin Override',
                overriddenBy: a.overriddenBy ? `User ID: ${a.overriddenBy}` : '-',
                overrideReason: a.overrideReason || '-',
            });
        });
        const monthName = new Date(targetYear, targetMonth).toLocaleString('id-ID', { month: 'long' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Rekap_Kehadiran_Guru_${monthName}_${targetYear}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal export Excel." });
    }
});
// ──────────────────────────────────────────────
// GET / — List semua kehadiran (admin/kepala)
// ──────────────────────────────────────────────
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "admin" && req.user.role !== "kepala_sekolah") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const { month, year } = req.query;
        const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
        const targetYear = year ? Number(year) : new Date().getFullYear();
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0);
        const attendances = await prisma_1.prisma.teacherAttendance.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            include: {
                teacher: { select: { name: true, nip: true } }
            },
            orderBy: [{ date: 'desc' }, { teacher: { name: 'asc' } }]
        });
        res.json({ success: true, data: attendances });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ──────────────────────────────────────────────
// PUT /:id/override — Override kehadiran (admin)
// Tetap setelah /export dan / agar tidak conflict
// ──────────────────────────────────────────────
router.put("/:id/override", auth_1.verifyJWT, async (req, res) => {
    try {
        // Hanya admin yang boleh override
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Hanya admin yang bisa override." });
        }
        const { status, note, overrideReason } = req.body;
        if (!overrideReason) {
            return res.status(400).json({
                success: false,
                message: "Alasan override wajib diisi untuk audit trail."
            });
        }
        const updated = await prisma_1.prisma.teacherAttendance.update({
            where: { id: Number(req.params.id) },
            data: {
                status,
                note,
                checkinType: 'admin_override',
                overriddenBy: req.user.id, // Layer 4: catat siapa yang ubah
                overriddenAt: new Date(), // Layer 4: catat kapan diubah
                overrideReason, // Layer 4: catat alasan
            }
        });
        res.json({
            success: true,
            message: "Status kehadiran berhasil diperbarui.",
            data: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ──────────────────────────────────────────────
// POST /manual-input — Input manual oleh admin
// Untuk guru yang lupa check-in sendiri
// ──────────────────────────────────────────────
router.post("/manual-input", auth_1.verifyJWT, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const { teacherId, date, status, note, overrideReason } = req.body;
        if (!teacherId || !date || !status || !overrideReason) {
            return res.status(400).json({
                success: false,
                message: "teacherId, date, status, dan overrideReason wajib diisi."
            });
        }
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Cek apakah sudah ada record di tanggal itu
        const existing = await prisma_1.prisma.teacherAttendance.findUnique({
            where: { teacherId_date: { teacherId: Number(teacherId), date: targetDate } }
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Sudah ada record kehadiran untuk guru ini di tanggal tersebut. Gunakan fitur override."
            });
        }
        const attendance = await prisma_1.prisma.teacherAttendance.create({
            data: {
                teacherId: Number(teacherId),
                date: targetDate,
                status: status,
                checkinAt: null, // tidak ada timestamp karena input manual
                checkinType: 'admin_override',
                note: note || null,
                isLate: false,
                overriddenBy: req.user.id,
                overriddenAt: new Date(),
                overrideReason,
            }
        });
        res.status(201).json({
            success: true,
            message: "Kehadiran guru berhasil diinput secara manual.",
            data: attendance
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
exports.default = router;
//# sourceMappingURL=teacher-attendances.route.js.map