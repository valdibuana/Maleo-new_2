import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";

const router = Router();

// ──────────────────────────────────────────────
// Validation Schema
// ──────────────────────────────────────────────

const classSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
  level: z.coerce.number().int().positive("Level harus angka positif"),
  homeroomTeacherId: z.coerce.number().int().positive("ID wali kelas tidak valid"),
});

// ──────────────────────────────────────────────
// GET /api/classes
// Akses: Semua role yang terautentikasi
// ──────────────────────────────────────────────
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        homeroomTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { level: "asc" },
    });

    const result = classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      homeroomTeacherId: c.homeroomTeacherId,
      homeroomTeacherName: c.homeroomTeacher?.name,
      studentCount: c._count.students,
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error("[Classes] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// ──────────────────────────────────────────────
// GET /api/classes/:id
// ──────────────────────────────────────────────
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        homeroomTeacher: { select: { id: true, name: true } },
        students: { select: { id: true, nis: true, name: true, gender: true, status: true } },
      },
    });

    if (!classData) {
      res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
      return;
    }

    res.json({ success: true, data: classData });
  } catch (error) {
    console.error("[Classes] GET by ID error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// ──────────────────────────────────────────────
// POST /api/classes
router.post(
  "/",
  verifyJWT,
  checkRole("admin"),
  validate(classSchema),
  async (req: Request, res: Response) => {
    try {
      const { level, homeroomTeacherId, name } = req.body;

      // 1. Cek Tahun Ajaran Aktif
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
      });

      if (!activeYear) {
        return res.status(400).json({
          success: false,
          message: "Gagal menyimpan: Tidak ada Tahun Ajaran yang aktif. Silakan buat Tahun Ajaran terlebih dahulu di menu Tahun Ajaran.",
        });
      }

      // 2. Cek Duplikasi Wali Kelas
      const existingHomeroom = await prisma.class.findFirst({
        where: { homeroomTeacherId: Number(homeroomTeacherId) },
        include: { homeroomTeacher: { select: { name: true } } },
      });

      if (existingHomeroom) {
        return res.status(400).json({
          success: false,
          message: `Gagal: Guru ${existingHomeroom.homeroomTeacher.name} sudah menjabat sebagai Wali Kelas di kelas ${existingHomeroom.name}.`,
        });
      }

      // 3. Cek Duplikasi Nama/Kombinasi Kelas
      const existingClass = await prisma.class.findUnique({
        where: { name: name },
      });

      if (existingClass) {
        return res.status(400).json({
          success: false,
          message: `Gagal: Kelas dengan nama "${name}" sudah ada. Gunakan kombinasi Tingkat dan Grup yang berbeda.`,
        });
      }

      const classData = await prisma.class.create({
        data: {
          name,
          level: Number(level),
          homeroomTeacherId: Number(homeroomTeacherId),
        },
      });

      res.status(201).json({
        success: true,
        message: "Kelas berhasil ditambahkan",
        data: classData,
      });
    } catch (error: any) {
      console.error("[Classes] POST error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

// ──────────────────────────────────────────────
// PUT /api/classes/:id
// Akses: Admin
// ──────────────────────────────────────────────
router.put(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  validate(classSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const classData = await prisma.class.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json({
        success: true,
        message: "Kelas berhasil diperbarui",
        data: classData,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        return;
      }
      console.error("[Classes] PUT error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

// ──────────────────────────────────────────────
// DELETE /api/classes/:id
// Akses: Admin
// ──────────────────────────────────────────────
// DELETE /api/classes/:id
router.delete("/:id", verifyJWT, checkRole("admin"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Safe Delete: Cek relasi dengan Siswa dan Jadwal
    const [hasStudents, hasSchedules] = await Promise.all([
      prisma.student.findFirst({ where: { classId: id } }),
      prisma.schedule.findFirst({ where: { classId: id } }),
    ]);

    if (hasStudents || hasSchedules) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus kelas: Masih terdapat data Siswa atau Jadwal yang terdaftar di kelas ini."
      });
    }

    await prisma.class.delete({ where: { id } });
    res.json({ success: true, message: "Kelas berhasil dihapus" });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ success: false, message: "Kelas tidak ditemukan" }); return; }
    console.error("[Classes] DELETE error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

export default router;
