import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── PUBLIC ROUTES (no auth required) ───────────────────────────────────────

// GET /api/schedule-slots/template
// Public: downloads an Excel template that matches the reference format
router.get("/template", async (req: Request, res: Response) => {
  try {
    const exceljs = require("exceljs");
    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet("Template Jadwal KBM");

    const BLUE       = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
    const HEADER_BG  = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFBFDBFE' } };
    const WHITE      = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } };
    const thinBorder = {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const }
    };

    // ── Row 1: Title ─────────────────────────────────────────────────────────
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value    = 'JADWAL KBM KELAS [ISI NOMOR KELAS, contoh: 11]';
    titleCell.font     = { bold: true, size: 13, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill     = HEADER_BG;
    titleCell.border   = thinBorder;
    sheet.getRow(1).height = 24;

    // ── Row 2: Header ────────────────────────────────────────────────────────
    const headerRow = sheet.addRow(['Waktu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at"]);
    headerRow.height = 20;
    headerRow.eachCell((cell: any) => {
      cell.font      = { bold: true, size: 10, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill      = HEADER_BG;
      cell.border    = thinBorder;
    });

    // ── Time slots with example data ──────────────────────────────────────────
    // NOTE on time format: Using colon format (07:30-08:00) to match frontend lookup.
    // The import endpoint normalizes dots -> colons as fallback for user-typed files.
    const timeSlots = [
      { time: '07:30-08:00', isBreak: false, ex: ['Upacara Bendera', 'Literasi (Sahabat Pena)', 'Sholat Dhuha & Tadarus', 'Al-Masurat', 'Tadarus (Surat Yasin)'] },
      { time: '08:00-08:35', isBreak: false, ex: ['B. Indonesia (Bu Hani)', 'Sosiologi (Bu Trisna)', 'Geografi (Pak Hardjono)', 'MTK', 'Lit.Digital (Bu Tinuk)'] },
      { time: '08:35-09:10', isBreak: false, ex: ['B. Indonesia (Bu Hani)', 'Sosiologi (Bu Trisna)', 'Geografi (Pak Hardjono)', 'MTK', 'Lit.Digital (Bu Tinuk)'] },
      { time: '09:10-09:45', isBreak: false, ex: ['Sejarah (Pak Khairul)', 'AP (Bu Avie)', 'TIK (Bu Neneng)', 'Art (Pak Latief)', 'Kom.dig (Pak Jamal)'] },
      { time: '09:45-10:20', isBreak: false, ex: ['Sejarah (Pak Khairul)', 'AP (Bu Avie)', 'TIK (Bu Neneng)', 'Art (Pak Latief)', 'Kom.dig (Pak Jamal)'] },
      { time: '10:20-10:30', isBreak: true,  breakLabel: 'ISTIRAHAT' },
      { time: '10:30-11:05', isBreak: false, ex: ['Ekonomi (Pak Djoen)', 'PKN (Pak Irwan)', 'PAI (Pak Afrizal)', 'TIK Art Digital (Bu Neneng)', 'B.Inggris (Pak Reza)'] },
      { time: '11:05-11:40', isBreak: false, ex: ['Ekonomi (Pak Djoen)', 'PKN (Pak Irwan)', 'PAI (Pak Afrizal)', 'TIK Art Digital (Bu Neneng)', 'B.Inggris (Pak Reza)'] },
      { time: '11:40-13:00', isBreak: true,  breakLabel: 'ISHOMA (Istirahat, Sholat, dan Makan)' },
      { time: '13:00-13:35', isBreak: false, ex: ['PJOK (Pak Deni)', 'Bola', 'PKWU (Bu Nia)', 'GURU TAMU', 'EKSKUL KESENIAN'] },
      { time: '13:35-14:20', isBreak: false, ex: ['PJOK (Pak Deni)', 'Bola', 'PKWU (Bu Nia)', 'GURU TAMU', 'EKSKUL KESENIAN'] },
    ];

    timeSlots.forEach((slot) => {
      if (slot.isBreak) {
        // Break row: merge B–F, blue background, bold white text
        const row = sheet.addRow([slot.time, '', '', '', '', '']);
        row.height = 18;
        // Style column A (time)
        const cellA = row.getCell(1);
        cellA.font      = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        cellA.fill      = BLUE;
        cellA.alignment = { horizontal: 'center', vertical: 'middle' };
        cellA.border    = thinBorder;
        // Merge B–F
        sheet.mergeCells(`B${row.number}:F${row.number}`);
        const cellB = sheet.getCell(`B${row.number}`);
        cellB.value     = slot.breakLabel!;
        cellB.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
        cellB.fill      = BLUE;
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };
        cellB.border    = thinBorder;
      } else {
        // Academic row
        const row = sheet.addRow([slot.time, ...(slot.ex || ['', '', '', '', ''])]);
        row.height = 30;
        row.eachCell((cell: any, colNum: number) => {
          cell.font      = { size: 9, name: 'Calibri' };
          cell.alignment = { horizontal: colNum === 1 ? 'center' : 'center', vertical: 'middle', wrapText: true };
          cell.fill      = WHITE;
          cell.border    = thinBorder;
          if (colNum === 1) cell.font = { ...cell.font, bold: true };
        });
      }
    });

    // ── Column widths ─────────────────────────────────────────────────────────
    sheet.getColumn(1).width = 14; // Waktu
    sheet.getColumn(2).width = 22; // Senin
    sheet.getColumn(3).width = 22; // Selasa
    sheet.getColumn(4).width = 22; // Rabu
    sheet.getColumn(5).width = 22; // Kamis
    sheet.getColumn(6).width = 22; // Jum'at

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Jadwal_KBM.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('[ScheduleSlots] Template error:', error);
    res.status(500).json({ success: false, message: 'Gagal men-generate template.' });
  }
});

// ─── PROTECTED ROUTES ────────────────────────────────────────────────────────

// Middleware to get identity based on role (similar to hub.route.ts)
const identityGuard = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { nipNis: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Profil user tidak lengkap." });
    }

    if (user.role === "teacher" && user.nipNis) {
      const teacher = await prisma.teacher.findUnique({ where: { nip: user.nipNis } });
      if (teacher) (req as any).teacherId = teacher.id;
      (req as any).teacherName = teacher?.name;
    } else if (user.role === "student" && user.nipNis) {
      const student = await prisma.student.findUnique({ where: { nis: user.nipNis }, include: { class: true } });
      if (student) {
        (req as any).studentId = student.id;
        (req as any).classLevel = student.class?.level;
      }
    } else if (user.role === "guardian" && user.nipNis) { // Assume nipNis is used or find children via guardian relation
      const guardianUser = await prisma.user.findUnique({ where: { id: req.user?.id }, include: { guardian: { include: { students: { include: { class: true } } } } } });
      if (guardianUser?.guardian?.students.length) {
         // Get all unique class levels the guardian's children are in
         const classLevels = [...new Set(guardianUser.guardian.students.map(s => s.class?.level).filter(Boolean))];
         if (classLevels.length > 0) {
           (req as any).classLevels = classLevels;
           (req as any).classLevel = classLevels[0]; // fallback to first class level
         }
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan identitas." });
  }
};

router.use(verifyJWT);
router.use(identityGuard);

// GET /api/schedule-slots
// All roles can access, but filtered based on their role
router.get("/", async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const { classLevel, day, academicYearId, all } = req.query;

    let where: any = {};

    if (classLevel) where.classLevel = Number(classLevel);
    if (day) where.day = day;
    
    // Default to active academic year if not provided
    if (academicYearId) {
      where.academicYearId = Number(academicYearId);
    } else {
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
      if (activeYear) where.academicYearId = activeYear.id;
    }

    if (role === "teacher" && all !== "true") {
      // Teacher sees slots assigned to them (by ID or exact name match)
      // When all=true, teacher can see ALL schedules (no filter)
      where.OR = [
        { teacherId: req.teacherId },
        { teacherName: req.teacherName }
      ];
    } else if (role === "student" || role === "guardian") {
      // Students and guardians see slots for their class level
      if (role === "guardian" && req.classLevels) {
        where.classLevel = { in: req.classLevels };
      } else {
        where.classLevel = req.classLevel;
      }
      where.isPublished = true;
    }
    // admin and kepala_sekolah see all based on filters

    const slots = await prisma.scheduleSlot.findMany({
      where,
      orderBy: [
        { day: "asc" },
        { timeSlot: "asc" }
      ],
      include: {
        teacher: { select: { id: true, name: true, nip: true } }
      }
    });

    res.json({ success: true, data: slots });
  } catch (error) {
    console.error("[ScheduleSlots] Error fetching slots:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data jadwal KBM." });
  }
});

// GET /api/schedule-slots/my-schedule (Teacher only)
router.get("/my-schedule", checkRole("teacher"), async (req: any, res: Response) => {
  try {
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan." });

    const slots = await prisma.scheduleSlot.findMany({
      where: {
        academicYearId: activeYear.id,
        OR: [
          { teacherId: req.teacherId },
          { teacherName: req.teacherName }
        ]
      },
      orderBy: [
        { day: "asc" },
        { timeSlot: "asc" }
      ]
    });

    // Group by day
    const grouped = slots.reduce((acc: any, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil jadwal Anda." });
  }
});

// ─── NEW: Export endpoint ──────────────────────────────────────────────────
// GET /api/schedule-slots/export?classLevel=N
// IMPORTANT: MUST be placed BEFORE /class/:classLevel to avoid route collision.
// If placed after, Express will interpret "export" as :classLevel param value.
router.get("/export", checkRole("admin", "kepala_sekolah"), async (req: any, res: Response) => {
  try {
    const { classLevel } = req.query;
    if (!classLevel) return res.status(400).json({ success: false, message: "Tingkat kelas wajib diisi" });

    const targetLevel = Number(classLevel);
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan" });

    const slots = await prisma.scheduleSlot.findMany({
      where: { academicYearId: activeYear.id, classLevel: targetLevel },
      orderBy: [{ day: "asc" }, { timeSlot: "asc" }]
    });

    const exceljs = require("exceljs");
    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet(`Jadwal KBM Kelas ${targetLevel}`);

    const BLUE       = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } };
    const HEADER_BG  = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFBFDBFE' } };
    const WHITE      = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } };
    const thinBorder = {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const }
    };

    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    // Get unique time slots in order
    const timeSlots = [...new Set(slots.map(s => s.timeSlot))].sort();

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `JADWAL KBM KELAS ${targetLevel}`;
    titleCell.font = { bold: true, size: 13, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = HEADER_BG;
    titleCell.border = thinBorder;
    sheet.getRow(1).height = 24;

    // Header row
    const headerRow = sheet.addRow(['Waktu', ...days]);
    headerRow.height = 20;
    headerRow.eachCell((cell: any) => {
      cell.font = { bold: true, size: 10, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = HEADER_BG;
      cell.border = thinBorder;
    });

    // Group slots by timeSlot
    const slotsByTime: Record<string, Record<string, string>> = {};
    slots.forEach(s => {
      if (!slotsByTime[s.timeSlot]) slotsByTime[s.timeSlot] = {};
      if (s.slotType === "break") {
        slotsByTime[s.timeSlot][s.day] = s.subjectName || "";
      } else {
        const label = s.teacherName ? `${s.subjectName} (${s.teacherName})` : (s.subjectName || "");
        slotsByTime[s.timeSlot][s.day] = label;
      }
    });

    // Data rows
    timeSlots.forEach((time) => {
      const dayData = slotsByTime[time] || {};
      const dayValues = days.map(d => dayData[d] || "");
      const row = sheet.addRow([time, ...dayValues]);
      
      // Check if this is a break row
      const isBreak = dayValues.some(v => v.toUpperCase().includes("ISTIRAHAT") || v.toUpperCase().includes("ISHOMA"));
      
      if (isBreak) {
        row.height = 18;
        row.eachCell((cell: any, colNum: number) => {
          cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
          cell.fill = BLUE;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
        });
      } else {
        row.height = 30;
        row.eachCell((cell: any, colNum: number) => {
          cell.font = { size: 9, name: 'Calibri' };
          cell.alignment = { horizontal: colNum === 1 ? 'center' : 'center', vertical: 'middle', wrapText: true };
          cell.fill = WHITE;
          cell.border = thinBorder;
          if (colNum === 1) cell.font = { ...cell.font, bold: true };
        });
      }
    });

    // Column widths
    sheet.getColumn(1).width = 14;
    sheet.getColumn(2).width = 22;
    sheet.getColumn(3).width = 22;
    sheet.getColumn(4).width = 22;
    sheet.getColumn(5).width = 22;
    sheet.getColumn(6).width = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Jadwal_KBM_Kelas_${targetLevel}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error("[ScheduleSlots] Export error:", error);
    res.status(500).json({ success: false, message: "Gagal mengexport jadwal." });
  }
});

// GET /api/schedule-slots/class/:classLevel
router.get("/class/:classLevel", async (req: any, res: Response) => {
  try {
    const classLevel = Number(req.params.classLevel);
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan." });

    const slots = await prisma.scheduleSlot.findMany({
      where: {
        academicYearId: activeYear.id,
        classLevel,
        ...(req.user.role === "student" || req.user.role === "guardian" ? { isPublished: true } : {})
      },
      orderBy: [
        { day: "asc" },
        { timeSlot: "asc" }
      ],
      include: {
        teacher: { select: { id: true, name: true } }
      }
    });

    // Group by day
    const grouped = slots.reduce((acc: any, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil jadwal kelas." });
  }
});

// GET /api/schedule-slots/confirmation-status (Admin/Kepsek)
router.get("/confirmation-status", checkRole("admin", "kepala_sekolah"), async (req: any, res: Response) => {
  try {
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan." });

    const slots = await prisma.scheduleSlot.findMany({
      where: {
        academicYearId: activeYear.id,
        slotType: "academic",
        teacherName: { not: null }
      }
    });

    const total = slots.length;
    const confirmed = slots.filter(s => s.isConfirmed).length;
    const pending = total - confirmed;

    const pendingTeachersSet = new Set(
      slots.filter(s => !s.isConfirmed && s.teacherName).map(s => s.teacherName)
    );

    res.json({
      success: true,
      data: {
        total,
        confirmed,
        pending,
        pendingTeachers: Array.from(pendingTeachersSet)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil status konfirmasi." });
  }
});


// ─── PUT /publish MUST be placed BEFORE /:id to avoid route collision ──────
// If /:id comes first, Express will match "publish" as a param value (id="publish")
// which will cause a 404 error when trying to find a slot with id=NaN.
// PUT /api/schedule-slots/publish
router.put("/publish", checkRole("admin", "kepala_sekolah"), async (req: any, res: Response) => {
  try {
    const { classLevel, isPublished } = req.body;
    if (!classLevel) return res.status(400).json({ success: false, message: "Tingkat kelas wajib diisi" });

    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan" });

    const updated = await prisma.scheduleSlot.updateMany({
      where: { classLevel: Number(classLevel), academicYearId: activeYear.id },
      data: { isPublished: Boolean(isPublished) }
    });

    res.json({ success: true, message: `Status publish kelas ${classLevel} berhasil diubah. (${updated.count} slot diperbarui)` });
  } catch (error) {
    console.error("[ScheduleSlots] Publish error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengubah status jadwal" });
  }
});

// ─── CRUD: Update (single slot) ──────────────────────────────────────────────
// PUT /api/schedule-slots/:id (Admin only)
router.put("/:id", checkRole("admin"), async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { teacherId, teacherName, isConfirmed, subjectName } = req.body;

    const existingSlot = await prisma.scheduleSlot.findUnique({ where: { id } });
    if (!existingSlot) return res.status(404).json({ success: false, message: "Slot tidak ditemukan." });

    // Check collision if teacher is changing and it's an academic slot
    if (teacherId && existingSlot.slotType === "academic") {
      const collision = await prisma.scheduleSlot.findFirst({
        where: {
          academicYearId: existingSlot.academicYearId,
          day: existingSlot.day,
          timeSlot: existingSlot.timeSlot,
          teacherId: Number(teacherId),
          id: { not: id } // exclude self
        }
      });

      if (collision) {
        return res.status(409).json({ success: false, message: "Konflik jadwal: Guru ini sudah memiliki kelas di waktu yang sama" });
      }
    }

    const updated = await prisma.scheduleSlot.update({
      where: { id },
      data: {
        teacherId: teacherId ? Number(teacherId) : null,
        teacherName: teacherName ?? existingSlot.teacherName,
        subjectName: subjectName ?? existingSlot.subjectName,
        isConfirmed: isConfirmed ?? existingSlot.isConfirmed,
        confirmationDeadline: isConfirmed ? null : existingSlot.confirmationDeadline
      }
    });

    res.json({ success: true, message: "Jadwal berhasil diupdate.", data: updated });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: "Konflik jadwal: Constraint unik terlanggar." });
    }
    res.status(500).json({ success: false, message: "Gagal mengupdate jadwal." });
  }
});

// PATCH /api/schedule-slots/:id/confirm (Admin only)
router.patch("/:id/confirm", checkRole("admin"), async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { teacherId, teacherName } = req.body;

    const existingSlot = await prisma.scheduleSlot.findUnique({ where: { id } });
    if (!existingSlot) return res.status(404).json({ success: false, message: "Slot tidak ditemukan." });
    
    let updateData: any = { isConfirmed: true, confirmationDeadline: null };
    
    if (teacherId) updateData.teacherId = Number(teacherId);
    if (teacherName) updateData.teacherName = teacherName;

    // Check collision if teacher is assigned
    const targetTeacherId = updateData.teacherId || existingSlot.teacherId;
    if (targetTeacherId && existingSlot.slotType === "academic") {
      const collision = await prisma.scheduleSlot.findFirst({
        where: {
          academicYearId: existingSlot.academicYearId,
          day: existingSlot.day,
          timeSlot: existingSlot.timeSlot,
          teacherId: targetTeacherId,
          id: { not: id }
        }
      });

      if (collision) {
        return res.status(409).json({ success: false, message: "Konflik jadwal: Guru ini sudah memiliki kelas di waktu yang sama" });
      }
    }

    const updated = await prisma.scheduleSlot.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, message: "Konfirmasi berhasil.", data: updated });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: "Konflik jadwal: Constraint unik terlanggar." });
    }
    res.status(500).json({ success: false, message: "Gagal mengonfirmasi jadwal." });
  }
});

// POST /api/schedule-slots/bulk-seed (Admin only)
router.post("/bulk-seed", checkRole("admin"), async (req: any, res: Response) => {
  try {
    const { runScheduleSeed } = require("../../prisma/seeds/scheduleSlots");
    const result = await runScheduleSeed();
    res.json({ success: true, message: "Seed berhasil dijalankan.", data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menjalankan seed." });
  }
});

// POST /api/schedule-slots (Admin/Kepsek) — create a single slot manually
router.post("/", checkRole("admin", "kepala_sekolah"), async (req: any, res: Response) => {
  try {
    const { classLevel, day, timeSlot, jpLabel, slotType, subjectName, teacherName, teacherId } = req.body;

    if (!classLevel || !day || !timeSlot) {
      return res.status(400).json({ success: false, message: "classLevel, day, dan timeSlot wajib diisi" });
    }

    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan" });

    // Check if slot already exists for this class+day+timeSlot
    const existing = await prisma.scheduleSlot.findFirst({
      where: { academicYearId: activeYear.id, classLevel: Number(classLevel), day, timeSlot }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "Slot jadwal untuk kelas, hari, dan jam ini sudah ada. Hapus atau edit slot yang ada terlebih dahulu." });
    }

    // If teacherId provided, check for collision (same teacher, same day+timeSlot, different class)
    if (teacherId) {
      const collision = await prisma.scheduleSlot.findFirst({
        where: { academicYearId: activeYear.id, day, timeSlot, teacherId: Number(teacherId) }
      });
      if (collision) {
        return res.status(409).json({ success: false, message: "Konflik jadwal: Guru ini sudah mengajar kelas lain pada waktu yang sama." });
      }
    }

    const newSlot = await prisma.scheduleSlot.create({
      data: {
        academicYearId: activeYear.id,
        classLevel: Number(classLevel),
        day,
        timeSlot,
        jpLabel: jpLabel || timeSlot,
        slotType: slotType || "academic",
        subjectName: subjectName || null,
        teacherName: teacherName || null,
        teacherId: teacherId ? Number(teacherId) : null,
        isConfirmed: false,
        isPublished: false,
      },
      include: { teacher: { select: { id: true, name: true } } }
    });

    res.status(201).json({ success: true, message: "Slot jadwal berhasil ditambahkan.", data: newSlot });
  } catch (error: any) {
    console.error("[ScheduleSlots] Create manual slot error:", error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: "Konflik jadwal: Slot ini sudah ada." });
    }
    res.status(500).json({ success: false, message: "Gagal menambahkan slot jadwal." });
  }
});

// DELETE /api/schedule-slots/:id (Admin only) — delete a single slot
router.delete("/:id", checkRole("admin", "kepala_sekolah"), async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.scheduleSlot.delete({ where: { id } });
    res.json({ success: true, message: "Slot jadwal berhasil dihapus." });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: "Slot tidak ditemukan." });
    }
    res.status(500).json({ success: false, message: "Gagal menghapus slot jadwal." });
  }
});

// POST /api/schedule-slots/import
router.post("/import", checkRole("admin", "kepala_sekolah"), upload.single("excel"), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "File Excel wajib diunggah" });
    const { classLevel } = req.body;
    if (!classLevel) return res.status(400).json({ success: false, message: "Tingkat kelas wajib dipilih" });
    const targetLevel = Number(classLevel);

    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan" });

    const exceljs = require("exceljs");
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    
    // Create mapping of Teacher Names -> ID
    const teachers = await prisma.teacher.findMany({ select: { id: true, name: true } });
    const teacherMap = new Map();
    teachers.forEach(t => {
       // normalize names for better matching
       teacherMap.set(t.name.toLowerCase().trim(), t.id);
    });

    // Clear existing slots for this classLevel & academicYear to replace it.
    await prisma.scheduleSlot.deleteMany({
      where: { academicYearId: activeYear.id, classLevel: targetLevel }
    });

    const newSlots: any[] = [];

    // Row 2 is headers, Row 3+ is data
    sheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber <= 2) return;
      const time = row.getCell(1).text?.trim();
      if (!time) return;

      // NORMALIZE timeSlot: replace dots with colons to match frontend format
      // (e.g., "07.30-08.00" → "07:30-08:00")
      const normalizedTime = time.replace(/\./g, ':');

      // Check if this is a break row (ISTIRAHAT / ISHOMA)
      // In the template, break rows have merged cells B-F with label centered
      // We check any cell in that row for the keyword
      const firstDayCell = row.getCell(2).text?.trim() || "";
      const isBreakRow =
        firstDayCell.toUpperCase().includes("ISTIRAHAT") ||
        firstDayCell.toUpperCase().includes("ISHOMA") ||
        time.toUpperCase().includes("ISTIRAHAT") ||
        time.toUpperCase().includes("ISHOMA");

      if (isBreakRow) {
        // Create break slots for ALL days so they appear in day-filtered queries
        days.forEach((dayName) => {
          newSlots.push({
            academicYearId: activeYear.id,
            classLevel: targetLevel,
            day: dayName,
            timeSlot: normalizedTime,
            jpLabel: firstDayCell || normalizedTime,
            slotType: "break",
            subjectName: firstDayCell || normalizedTime,
            teacherName: null,
            teacherId: null,
            isConfirmed: false,
            isPublished: false
          });
        });
        return; // skip the per-day loop below
      }

      // For each day: Senin=2, Selasa=3, Rabu=4, Kamis=5, Jumat=6
      for (let i = 0; i < 5; i++) {
        const colIndex = i + 2;
        const cellValue = row.getCell(colIndex).text?.trim();
        const dayName = days[i];

        if (!cellValue) continue;

        let slotType = "academic";
        let subjectName: string | null = null;
        let teacherName: string | null = null;
        let teacherId: number | null = null;

        // Parse "Mapel (Guru)"
        const match = cellValue.match(/^(.*?)\((.*?)\)$/);
        if (match) {
          subjectName = match[1].trim();
          teacherName = match[2].trim();

          // try match teacherId — normalize: remove honorifics, lowercase
          const normalizedSearch = teacherName!.toLowerCase().replace(/^(bu|pak|bapak|ibu)\s+/g, "").trim();
          for (let [tName, tId] of teacherMap.entries()) {
            const normalizedTeacher = tName.replace(/^(bu|pak|bapak|ibu)\s+/g, "").trim();
            if (normalizedTeacher.includes(normalizedSearch) || normalizedSearch.includes(normalizedTeacher)) {
              teacherId = tId;
              break;
            }
          }
        } else {
          // No parentheses -> treat as non-academic activity
          slotType = "non_academic";
          subjectName = cellValue;
        }

        newSlots.push({
          academicYearId: activeYear.id,
          classLevel: targetLevel,
          day: dayName,
          timeSlot: normalizedTime,
          jpLabel: `JP ${rowNumber - 2}`,
          slotType,
          subjectName,
          teacherName,
          // Important: if teacherId would cause a unique constraint conflict
          // (same teacher, same day, same timeslot in another class), we leave it null
          // and store only the name. Admin can link it manually.
          teacherId: null, // will be set below after dedup check
          isConfirmed: false,
          isPublished: false,
          _resolvedTeacherId: teacherId, // temp field for post-processing
          _resolvedTeacherName: teacherName,
        });
      }
    });

    // Pre-query existing assignments for other classLevels in same academicYear
    // to detect cross-class teacher conflicts
    const existingSlots = await prisma.scheduleSlot.findMany({
      where: {
        academicYearId: activeYear.id,
        teacherId: { not: null }
      },
      select: { teacherId: true, day: true, timeSlot: true }
    });

    // Build a Set of "teacherId-day-timeSlot" already in DB (other classes)
    const existingKeys = new Set<string>(
      existingSlots.map(s => `${s.teacherId}-${s.day}-${s.timeSlot}`)
    );

    // Post-process: assign teacherIds only where no conflict exists
    const assignedSlotKeys = new Set<string>(); // tracks conflicts within THIS import batch
    const processedSlots = newSlots.map((slot: any) => {
      const { _resolvedTeacherId, _resolvedTeacherName, ...rest } = slot;
      if (_resolvedTeacherId) {
        const key = `${_resolvedTeacherId}-${slot.day}-${slot.timeSlot}`;
        if (!existingKeys.has(key) && !assignedSlotKeys.has(key)) {
          assignedSlotKeys.add(key);
          return { ...rest, teacherId: _resolvedTeacherId, teacherName: _resolvedTeacherName, isConfirmed: true };
        }
        // Conflict: teacher already assigned to another class at same time
        // Keep teacherName (for display) but leave teacherId null
        return { ...rest, teacherId: null, teacherName: _resolvedTeacherName, isConfirmed: false };
      }
      return rest;
    });

    await prisma.scheduleSlot.createMany({ data: processedSlots, skipDuplicates: true });

    res.json({ success: true, message: `Berhasil mengimport ${processedSlots.length} slot jadwal untuk kelas ${targetLevel}` });
  } catch (error) {
    console.error("[ScheduleSlots] Import error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat import jadwal" });
  }
});

export default router;