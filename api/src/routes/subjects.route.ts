import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";

const router = Router();

const subjectSchema = z.object({
  code: z.string().min(1, "Kode mapel wajib diisi"),
  name: z.string().min(1, "Nama mapel wajib diisi"),
  gradeLevel: z.coerce.number().int().positive("Tingkat harus angka positif"),
  hoursPerWeek: z.coerce.number().int().positive("Jam per minggu harus angka positif"),
  teacherId: z.coerce.number().int().positive("ID guru tidak valid"),
});

router.get("/", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    
    // Hard filtering for teacher role
    const reqUser = (req as any).user;
    if (reqUser?.role === "teacher") {
      // Find teacherId from User
      const user = await prisma.user.findUnique({
        where: { id: reqUser.id },
        select: { teacherId: true }
      });
      if (user?.teacherId) {
        where.teacherId = user.teacherId;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
      ];
    }
    const subjects = await prisma.subject.findMany({
      where,
      include: { teacher: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
    const result = subjects.map((s) => ({
      id: s.id, code: s.code, name: s.name, gradeLevel: s.gradeLevel,
      hoursPerWeek: s.hoursPerWeek, teacherId: s.teacherId, teacherName: s.teacher.name,
    }));
    res.json({ success: true, data: result, total: result.length });
  } catch (error) { 
    console.error("[Subjects] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" }); 
  }
});

router.post("/", verifyJWT, checkRole("admin"), validate(subjectSchema), async (req: Request, res: Response) => {
  try {
    const { code, name } = req.body;

    // Cek duplikasi kode
    const existingCode = await prisma.subject.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Gagal: Kode mapel "${code}" sudah digunakan.` });
    }

    // Cek duplikasi nama (optional but good)
    const existingName = await prisma.subject.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (existingName) {
      return res.status(400).json({ success: false, message: `Gagal: Nama mapel "${name}" sudah terdaftar.` });
    }

    const subject = await prisma.subject.create({ data: req.body });
    res.status(201).json({ success: true, message: "Mata Pelajaran berhasil ditambahkan", data: subject });
  } catch (error: any) {
    console.error("[Subjects] POST error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

router.put("/:id", verifyJWT, checkRole("admin"), validate(subjectSchema.partial()), async (req: Request, res: Response) => {
  try {
    const subject = await prisma.subject.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json({ message: "Mapel berhasil diperbarui", data: subject });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ message: "Mapel tidak ditemukan" }); return; }
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// DELETE /api/subjects/:id
router.delete("/:id", verifyJWT, checkRole("admin"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Safe Delete: Cek relasi dengan Jadwal dan Nilai
    const [hasSchedules, hasGrades] = await Promise.all([
      prisma.schedule.findFirst({ where: { subjectId: id } }),
      prisma.grade.findFirst({ where: { subjectId: id } }),
    ]);

    if (hasSchedules || hasGrades) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus mata pelajaran: Masih terdapat data Jadwal atau Nilai yang terikat dengan mapel ini."
      });
    }

    await prisma.subject.delete({ where: { id } });
    res.json({ success: true, message: "Mapel berhasil dihapus" });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ success: false, message: "Mapel tidak ditemukan" }); return; }
    console.error("[Subjects] DELETE error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

export default router;
