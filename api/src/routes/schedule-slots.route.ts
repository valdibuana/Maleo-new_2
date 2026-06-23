import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { checkRole } from "../middleware/role";

const router = Router();

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
         // Defaulting to the first child's class level for simplicity, can be expanded if needed
         (req as any).classLevel = guardianUser.guardian.students[0].class?.level;
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
      where.classLevel = req.classLevel;
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

// GET /api/schedule-slots/class/:classLevel
router.get("/class/:classLevel", async (req: any, res: Response) => {
  try {
    const classLevel = Number(req.params.classLevel);
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!activeYear) return res.status(404).json({ success: false, message: "Tahun akademik aktif tidak ditemukan." });

    const slots = await prisma.scheduleSlot.findMany({
      where: {
        academicYearId: activeYear.id,
        classLevel
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

export default router;
