import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { checkRole } from "../middleware/role";

const router = Router();

// Middleware to ensure the user is a teacher and get their teacherId
const teacherGuard = async (req: AuthRequest, res: Response, next: any) => {
  try {
    if (req.user?.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak. Hanya untuk Guru." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { nipNis: true }
    });

    if (!user || !user.nipNis) {
      return res.status(404).json({ success: false, message: "Data user tidak valid." });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { nip: user.nipNis }
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Profil guru tidak ditemukan." });
    }

    (req as any).teacherId = teacher.id;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
  }
};

router.use(verifyJWT);
router.use(teacherGuard);

// Ambil daftar kelas yang diajar oleh guru (dari jadwal atau wali kelas)
router.get("/classes", async (req: any, res: Response) => {
  try {
    const teacherId = req.teacherId;

    // Ambil kelas dari jadwal
    const scheduleClasses = await prisma.schedule.findMany({
      where: { teacherId },
      select: { class: { select: { id: true, name: true } } },
      distinct: ['classId']
    });

    // Ambil kelas dari wali kelas
    const homeroomClasses = await prisma.class.findMany({
      where: { homeroomTeacherId: teacherId },
      select: { id: true, name: true }
    });

    // Gabungkan dan hapus duplikasi
    const classesMap = new Map();
    scheduleClasses.forEach(s => classesMap.set(s.class.id, s.class));
    homeroomClasses.forEach(c => classesMap.set(c.id, c));

    const finalClasses = Array.from(classesMap.values());

    res.json({ success: true, data: finalClasses });
  } catch (error) {
    console.error("[Teacher Hub] Get Classes error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data kelas." });
  }
});

// 5. GET /attendance (Get Students for a class)
router.get("/attendance/students", async (req: any, res: Response) => {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ success: false, message: "classId wajib diisi." });

    const students = await prisma.student.findMany({
      where: { classId: Number(classId) },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data siswa." });
  }
});

router.post("/attendance", async (req: any, res: Response) => {
  try {
    const { date, attendances } = req.body; // attendances: [{ studentId, status, note }]
    
    const results = await prisma.$transaction(
      attendances.map((att: any) => 
        prisma.attendance.create({
          data: {
            date: new Date(date),
            status: att.status,
            note: att.note,
            studentId: Number(att.studentId)
          }
        })
      )
    );

    res.status(201).json({ success: true, message: "Data absensi berhasil disimpan", data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menyimpan data absensi." });
  }
});

export default router;
