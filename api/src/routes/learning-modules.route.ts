import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * Middleware untuk mendapatkan identitas tambahan (teacherId atau studentId)
 */
const identityGuard = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { nipNis: true, role: true }
    });

    if (!user || !user.nipNis) {
      return res.status(404).json({ success: false, message: "Profil user tidak lengkap." });
    }

    if (user.role === "teacher") {
      const teacher = await prisma.teacher.findUnique({ where: { nip: user.nipNis } });
      if (teacher) (req as any).teacherId = teacher.id;
    } else if (user.role === "student") {
      const student = await prisma.student.findUnique({ where: { nis: user.nipNis } });
      if (student) (req as any).studentId = student.id;
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan identitas." });
  }
};

router.use(verifyJWT);
router.use(identityGuard);

// ─────────────────────────────────────────────────────────────────────────────
// 1. LEARNING MODULES (CRUD & READ)
// ─────────────────────────────────────────────────────────────────────────────

// GET semua modul (difilter berdasarkan subjectId dan academicYearId)
router.get("/", async (req: any, res: Response) => {
  try {
    const { subjectId, academicYearId } = req.query;
    const { role } = req.user;

    let where: any = {
      subjectId: subjectId ? Number(subjectId) : undefined,
      academicYearId: academicYearId ? Number(academicYearId) : undefined,
    };

    // Filter berdasarkan role
    if (role === "teacher") {
      where.teacherId = req.teacherId;
    } else if (role === "student") {
      const studentClassId = req.classId;
      // Murid bisa lihat: modul kelasnya ATAU modul global (classId null)
      where = {
        ...where,
        isPublished: true,
        OR: [
          { classId: studentClassId },
          { classId: null },
        ],
      };
    } else {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const modules = await prisma.learningModule.findMany({
      where,
      include: {
        teacher: { select: { name: true } },
        sessions: {
          where: role === "student" ? { isPublished: true } : {},
          include: { 
            materials: {
              orderBy: { order: "asc" }
            } 
          },
          orderBy: { sessionNumber: "asc" }
        }
      },
      orderBy: { order: "asc" }
    });

    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data modul pembelajaran." });
  }
});

// CREATE Modul Baru (Hanya Guru)
router.post("/", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Hanya Guru yang dibenarkan." });
    
    const { title, description, subjectId, academicYearId, order } = req.body;
    const count = await prisma.learningModule.count({
      where: { teacherId: req.teacherId, subjectId: Number(subjectId), academicYearId: Number(academicYearId) }
    });

    if (count >= 5) {
      return res.status(400).json({ success: false, message: "Maksimum 5 modul dibenarkan." });
    }

    const module = await prisma.learningModule.create({
      data: { title, description, order: order || 0, subjectId: Number(subjectId), academicYearId: Number(academicYearId), teacherId: req.teacherId }
    });
    res.status(201).json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mencipta modul." });
  }
});

// UPDATE Modul (Hanya Guru)
router.put("/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Hanya Guru yang dibenarkan." });
    const { title, description, isPublished, order } = req.body;
    const module = await prisma.learningModule.update({
      where: { id: Number(req.params.id), teacherId: req.teacherId },
      data: { title, description, isPublished, order }
    });
    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengemas kini modul." });
  }
});

// DELETE Modul (Hanya Guru)
router.delete("/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Hanya Guru yang dibenarkan." });
    await prisma.learningModule.delete({ where: { id: Number(req.params.id), teacherId: req.teacherId } });
    res.json({ success: true, message: "Modul berjaya dipadam." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memadam modul." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODULE SESSIONS (CRUD)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/:moduleId/sessions", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Akses ditolak." });
    const moduleId = Number(req.params.moduleId);
    const { title, sessionNumber, isRepeatable } = req.body;

    const count = await prisma.moduleSession.count({ where: { moduleId } });
    if (count >= 7) return res.status(400).json({ success: false, message: "Maksimum 7 pertemuan dibenarkan." });

    const session = await prisma.moduleSession.create({
      data: { title, sessionNumber: sessionNumber || (count + 1), isRepeatable: isRepeatable || false, moduleId }
    });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mencipta pertemuan." });
  }
});

router.put("/sessions/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Akses ditolak." });
    const { title, sessionNumber, isRepeatable, isPublished } = req.body;
    const session = await prisma.moduleSession.update({
      where: { id: Number(req.params.id), module: { teacherId: req.teacherId } },
      data: { title, sessionNumber, isRepeatable, isPublished }
    });
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengemas kini pertemuan." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SESSION MATERIALS (CRUD & ACCESS)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/sessions/:sessionId/materials", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Akses ditolak." });
    const sessionId = Number(req.params.sessionId);
    const { title, type, fileUrl, order } = req.body;

    const count = await prisma.sessionMaterial.count({ where: { sessionId } });
    if (count >= 2) return res.status(400).json({ success: false, message: "Maksimum 2 materi dibenarkan." });

    const material = await prisma.sessionMaterial.create({
      data: { title, type, fileUrl, order: order || 0, sessionId }
    });
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat naik materi." });
  }
});

// Log Akses Materi (Hanya Siswa)
router.post("/materials/:id/access", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ success: false, message: "Hanya untuk Siswa." });
    
    await prisma.studentMaterialAccess.create({
      data: {
        studentId: req.studentId,
        materialId: Number(req.params.id)
      }
    });
    res.json({ success: true, message: "Akses direkodkan." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal merekodkan akses." });
  }
});

router.delete("/materials/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") return res.status(403).json({ success: false, message: "Akses ditolak." });
    await prisma.sessionMaterial.delete({
      where: { id: Number(req.params.id), session: { module: { teacherId: req.teacherId } } }
    });
    res.json({ success: true, message: "Materi berjaya dipadam." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memadam materi." });
  }
});

export default router;
