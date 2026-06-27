import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// ──────────────────────────────────────────────
// IDENTITY GUARD (inline, ikuti pola existing)
// ──────────────────────────────────────────────

const identityGuard = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { nipNis: true, role: true },
    });

    if (!user || !user.nipNis) {
      return res.status(404).json({ success: false, message: "Profil user tidak lengkap." });
    }

    if (user.role === "teacher") {
      const teacher = await prisma.teacher.findUnique({ where: { nip: user.nipNis } });
      if (teacher) (req as any).teacherId = teacher.id;
    } else if (user.role === "student") {
      const student = await prisma.student.findUnique({ where: { nis: user.nipNis } });
      if (student) {
        (req as any).studentId = student.id;
        (req as any).classId = student.classId;
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan identitas." });
  }
};

router.use(verifyJWT);
router.use(identityGuard);

// ──────────────────────────────────────────────
// TEACHER GUARD
// ──────────────────────────────────────────────

const teacherGuard = (req: any, res: Response, next: any) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya guru yang dapat mengakses endpoint ini.",
    });
  }
  next();
};

// ──────────────────────────────────────────────
// OWNERSHIP GUARD (ATP milik guru yang login)
// ──────────────────────────────────────────────

const atpOwnershipGuard = async (req: any, res: Response, next: any) => {
  try {
    const atpId = Number(req.params.atpId || req.params.id);
    if (!atpId) return next(); // lewati jika tidak ada atpId di param

    const atp = await prisma.aTP.findUnique({ where: { id: atpId } });
    if (!atp) {
      return res.status(404).json({ success: false, message: "ATP tidak ditemukan." });
    }

    if (atp.teacherId !== req.teacherId) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke ATP ini.",
      });
    }

    req.atp = atp;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
};

// ──────────────────────────────────────────────
// MULTER — Upload materi ATP (folder terpisah)
// ──────────────────────────────────────────────

const uploadDir = path.join(process.cwd(), "uploads", "atp-materials");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel"                                           // .xls
];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak didukung: ${file.mimetype}`));
    }
  },
});

// ──────────────────────────────────────────────
// HELPER: Generate Nomor Induk Unik
// ──────────────────────────────────────────────

async function generateNomorInduk(subjectCode: string, year: number) {
  const count = await prisma.aTP.count();
  const seq = String(count + 1).padStart(3, "0");
  return {
    nomorInduk1: `ATP/SMP/${year}/${seq}`,
    nomorInduk2: `MOD/${subjectCode.toUpperCase()}/${year}/${seq}`,
    nomorInduk3: `ATP/${year}/${seq}`,
  };
}

// ──────────────────────────────────────────────
// HELPER: Mime ke tipe MaterialTypeATP
// ──────────────────────────────────────────────

const mimeToType = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["application/msword", "docx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["video/mp4", "video_link"],
  ["image/jpeg", "image"],
  ["image/jpg", "image"],
  ["image/png", "image"],
  ["application/zip", "zip"],
  ["application/x-zip-compressed", "zip"],
]);

// ══════════════════════════════════════════════
// TEACHER — MATA PELAJARAN
// ══════════════════════════════════════════════

// GET /api/atp/my-subjects — mapel yang diampu guru (dari TeacherSubject)
router.get("/my-subjects", teacherGuard, async (req: any, res: Response) => {
  try {
    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId: req.teacherId },
      include: {
        subject: { select: { id: true, name: true, code: true, gradeLevel: true } },
      },
    });
    res.json({ success: true, data: teacherSubjects.map((ts) => ts.subject) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// POST /api/atp/my-subjects — tambah mapel (max 2)
router.post("/my-subjects", teacherGuard, async (req: any, res: Response) => {
  try {
    const teacherId = req.teacherId;
    const existingCount = await prisma.teacherSubject.count({ where: { teacherId } });

    if (existingCount >= 2) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah mengampu 2 mata pelajaran (maksimum). Hapus salah satu untuk menambah.",
      });
    }

    const { subjectId } = req.body;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: "subjectId wajib diisi." });
    }

    const existing = await prisma.teacherSubject.findUnique({
      where: { teacherId_subjectId: { teacherId, subjectId: Number(subjectId) } },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Mata pelajaran ini sudah Anda ampu." });
    }

    const ts = await prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId: Number(subjectId),
        isPrimary: existingCount === 0,
      },
      include: { subject: true },
    });

    res.status(201).json({ success: true, data: ts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// DELETE /api/atp/my-subjects/:subjectId — lepas mapel
router.delete("/my-subjects/:subjectId", teacherGuard, async (req: any, res: Response) => {
  try {
    const teacherId = req.teacherId;
    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId: { teacherId, subjectId: Number(req.params.subjectId) },
      },
    });
    res.json({ success: true, message: "Mata pelajaran berhasil dilepas." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ══════════════════════════════════════════════
// STUDENT VIEW (harus SEBELUM /:id)
// ══════════════════════════════════════════════

// GET /api/atp/student/my-atp — siswa lihat ATP published di kelasnya
router.get("/student/my-atp", async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya siswa yang dapat mengakses endpoint ini.'
      });
    }

    // Ambil data student dari user yang login
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        student: {
          select: { id: true, classId: true, name: true }
        }
      }
    });

    if (!user?.student) {
      return res.status(404).json({
        success: false,
        message: 'Data siswa tidak ditemukan. Hubungi admin.'
      });
    }

    const studentClassId = user.student.classId;

    // Fetch ATP yang published sesuai kelas siswa
    const atpList = await prisma.aTP.findMany({
      where: {
        classId: studentClassId,
        status: 'published',  // HANYA published
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true }
        },
        class: {
          select: { id: true, name: true }
        },
        teacher: {
          select: { name: true }
        },
        academicYear: {
          select: { id: true, name: true, semester: true, isActive: true }
        },
        meetings: {
          where: {
            status: 'published',  // HANYA meeting yang published
          },
          include: {
            materials: {
              orderBy: { order: 'asc' },
              // Semua material di meeting published = visible
            },
            _count: {
              select: { materials: true }
            }
          },
          orderBy: { meetingNumber: 'asc' }
        },
        _count: {
          select: {
            meetings: {
              where: { status: 'published' }
            }
          }
        }
      },
      orderBy: { publishedAt: 'desc' }
    });

    res.json({
      success: true,
      data: atpList,
      student: {
        id: user.student.id,
        name: user.student.name,
        classId: studentClassId,
      }
    });
  } catch (error) {
    console.error('[ATP Student] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.'
    });
  }
});

// POST /api/atp/student/materials/:materialId/access — track akses materi siswa
router.post("/student/materials/:materialId/access", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const studentId = req.studentId;
    const materialId = Number(req.params.materialId);

    await prisma.aTPMaterialAccess.upsert({
      where: { studentId_materialId: { studentId, materialId } },
      create: { studentId, materialId },
      update: { accessedAt: new Date() },
    });

    res.json({ success: true, message: "Akses direkodkan." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// GET /api/atp/template/excel — download template Excel (SEBELUM /:id)
router.get("/template/excel", teacherGuard, async (_req, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require("xlsx");

    const templateData = [
      {
        "No Pertemuan": 1,
        "Judul Pertemuan": "Contoh: Pengenalan Aljabar",
        "Alur Pembelajaran": "Contoh: Eksplorasi konsep → Diskusi → Latihan",
        "Tujuan Pembelajaran": "Contoh: Siswa memahami konsep dasar aljabar",
        Aktivitas: "Contoh: Ceramah, Diskusi Kelompok, Kuis",
        Penilaian: "Contoh: Kuis 20%, Tugas 30%, PSTS 50%",
      },
      ...Array.from({ length: 15 }, (_, i) => ({
        "No Pertemuan": i + 2,
        "Judul Pertemuan": "",
        "Alur Pembelajaran": "",
        "Tujuan Pembelajaran": "",
        Aktivitas: "",
        Penilaian: "",
      })),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 30 }, { wch: 40 },
      { wch: 40 }, { wch: 30 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Template ATP");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Template_ATP_Maleo.xlsx");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal generate template." });
  }
});

// ══════════════════════════════════════════════
// TEACHER — ATP CRUD
// ══════════════════════════════════════════════

// GET /api/atp — list semua ATP milik guru
router.get("/", teacherGuard, async (req: any, res: Response) => {
  try {
    const atpList = await prisma.aTP.findMany({
      where: { teacherId: req.teacherId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, level: true } },
        academicYear: { select: { id: true, name: true, semester: true } },
        _count: { select: { meetings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: atpList });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// POST /api/atp/generate — generate ATP + semua meeting sekaligus
router.post("/generate", teacherGuard, async (req: any, res: Response) => {
  try {
    const teacherId = req.teacherId;
    const {
      subjectId,
      classId,
      academicYearId,
      totalMeetings = 16,
      learningObjective,
      learningStrategy,
      teacherNote,
    } = req.body;

    if (!subjectId || !classId || !academicYearId) {
      return res.status(400).json({
        success: false,
        message: "subjectId, classId, dan academicYearId wajib diisi.",
      });
    }

    // Validasi max 16 pertemuan
    if (Number(totalMeetings) > 16) {
      return res.status(400).json({
        success: false,
        message: "Jumlah pertemuan tidak boleh lebih dari 16 per semester.",
      });
    }

    const meetings = Math.min(Math.max(Number(totalMeetings), 1), 16);

    // Validasi grade level: class level harus sesuai dengan subject gradeLevel
    const [subjectData, classData] = await Promise.all([
      prisma.subject.findUnique({ where: { id: Number(subjectId) }, select: { gradeLevel: true, name: true } }),
      prisma.class.findUnique({ where: { id: Number(classId) }, select: { level: true, name: true } }),
    ]);

    if (!subjectData) {
      return res.status(404).json({ success: false, message: "Mata pelajaran tidak ditemukan." });
    }
    if (!classData) {
      return res.status(404).json({ success: false, message: "Kelas tidak ditemukan." });
    }

    if (classData.level !== subjectData.gradeLevel) {
      return res.status(400).json({
        success: false,
        message: `Ketidaksesuaian tingkat: Mapel "${subjectData.name}" untuk tingkat ${subjectData.gradeLevel}, tetapi kelas "${classData.name}" adalah tingkat ${classData.level}.`,
      });
    }

    // Cek duplikat ATP
    const existing = await prisma.aTP.findFirst({
      where: {
        subjectId: Number(subjectId),
        classId: Number(classId),
        teacherId,
        academicYearId: Number(academicYearId),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "ATP untuk kombinasi mapel, kelas, dan tahun ajaran ini sudah ada.",
        data: existing,
      });
    }

    // Ambil data subject & academicYear untuk nomor induk
    const [subject, academicYear] = await Promise.all([
      prisma.subject.findUnique({ where: { id: Number(subjectId) } }),
      prisma.academicYear.findUnique({ where: { id: Number(academicYearId) } }),
    ]);

    if (!subject || !academicYear) {
      return res.status(404).json({ success: false, message: "Mata pelajaran atau tahun ajaran tidak ditemukan." });
    }

    const year = new Date(academicYear.startDate).getFullYear();
    const nomor = await generateNomorInduk(subject.code, year);

    // Buat ATP + meetings dalam 1 transaksi
    const atp = await prisma.$transaction(async (tx) => {
      const newATP = await tx.aTP.create({
        data: {
          ...nomor,
          subjectId: Number(subjectId),
          classId: Number(classId),
          teacherId,
          academicYearId: Number(academicYearId),
          totalMeetings: meetings,
          learningObjective: learningObjective || null,
          learningStrategy: learningStrategy || null,
          teacherNote: teacherNote || null,
          status: "draft",
        },
      });

      // Auto-generate semua meeting
      const meetingData = Array.from({ length: meetings }, (_, i) => ({
        atpId: newATP.id,
        meetingNumber: i + 1,
        title: `Pertemuan ${i + 1}`,
        status: "draft" as const,
      }));

      await tx.aTPMeeting.createMany({ data: meetingData });
      return newATP;
    });

    // Fetch ATP lengkap untuk response
    const atpWithMeetings = await prisma.aTP.findUnique({
      where: { id: atp.id },
      include: {
        meetings: { orderBy: { meetingNumber: "asc" } },
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true } },
        academicYear: { select: { name: true, semester: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: `ATP berhasil di-generate dengan ${meetings} pertemuan.`,
      data: atpWithMeetings,
    });
  } catch (error: any) {
    console.error("[ATP Generate]", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// GET /api/atp/:id — detail ATP + semua meeting
router.get("/:id", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const atp = await prisma.aTP.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        meetings: {
          include: {
            materials: { orderBy: { order: "asc" } },
            _count: { select: { materials: true } },
          },
          orderBy: { meetingNumber: "asc" },
        },
        subject: true,
        class: true,
        teacher: { select: { name: true, nip: true } },
        academicYear: true,
      },
    });
    res.json({ success: true, data: atp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// PUT /api/atp/:id — update header ATP
router.put("/:id", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const { learningObjective, learningStrategy, teacherNote } = req.body;
    const updated = await prisma.aTP.update({
      where: { id: Number(req.params.id) },
      data: { learningObjective, learningStrategy, teacherNote },
    });
    res.json({ success: true, message: "ATP berhasil diperbarui.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// PUT /api/atp/:id/publish — publish ATP (semua meeting ikut published)
router.put("/:id/publish", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const atpId = Number(req.params.id);
    const now = new Date();

    await prisma.$transaction([
      prisma.aTP.update({
        where: { id: atpId },
        data: { status: "published", publishedAt: now },
      }),
      prisma.aTPMeeting.updateMany({
        where: { atpId },
        data: { status: "published", publishedAt: now },
      }),
    ]);

    res.json({ success: true, message: "ATP berhasil dipublish. Siswa sekarang dapat melihat materi." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// PUT /api/atp/:id/archive — arsipkan ATP
router.put("/:id/archive", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    await prisma.aTP.update({
      where: { id: Number(req.params.id) },
      data: { status: "archived", archivedAt: new Date() },
    });
    res.json({ success: true, message: "ATP berhasil diarsipkan." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// DELETE /api/atp/:id — hapus ATP beserta cascades
router.delete("/:id", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    await prisma.aTP.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: "ATP berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// GET /api/atp/:id/bundle — export bundle JSON
router.get("/:id/bundle", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const atp = await prisma.aTP.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        meetings: {
          include: { materials: true },
          orderBy: { meetingNumber: "asc" },
        },
        subject: true,
        class: true,
        teacher: { select: { name: true } },
        academicYear: true,
      },
    });

    if (!atp) return res.status(404).json({ success: false, message: "ATP tidak ditemukan." });

    const bundle = {
      metadata: {
        nomorInduk1: atp.nomorInduk1,
        nomorInduk2: atp.nomorInduk2,
        nomorInduk3: atp.nomorInduk3,
        subject: atp.subject.name,
        class: atp.class.name,
        teacher: atp.teacher.name,
        academicYear: atp.academicYear.name,
        semester: atp.academicYear.semester,
        totalMeetings: atp.totalMeetings,
        generatedAt: new Date().toISOString(),
      },
      meetings: atp.meetings.map((m) => ({
        meetingNumber: m.meetingNumber,
        title: m.title,
        learningPath: m.learningPath,
        learningGoal: m.learningGoal,
        activity: m.activity,
        assessment: m.assessment,
        status: m.status,
        materials: m.materials.map((mat) => ({
          title: mat.title,
          type: mat.type,
          fileUrl: mat.fileUrl,
        })),
      })),
    };

    res.json({ success: true, data: bundle });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ══════════════════════════════════════════════
// MEETING ENDPOINTS
// ══════════════════════════════════════════════

// PUT /api/atp/:atpId/meetings/:meetingId — update isi pertemuan
router.put("/:atpId/meetings/:meetingId", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const meetingId = Number(req.params.meetingId);
    const atpId = Number(req.params.atpId);

    // Pastikan meeting ada di ATP ini
    const meeting = await prisma.aTPMeeting.findFirst({
      where: { id: meetingId, atpId },
    });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
    }

    const { title, learningPath, learningGoal, activity, assessment } = req.body;
    const updated = await prisma.aTPMeeting.update({
      where: { id: meetingId },
      data: { title, learningPath, learningGoal, activity, assessment },
    });

    res.json({ success: true, message: "Pertemuan berhasil diperbarui.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// PUT /api/atp/:atpId/meetings/:meetingId/publish — publish 1 meeting
router.put("/:atpId/meetings/:meetingId/publish", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const meetingId = Number(req.params.meetingId);
    const atpId = Number(req.params.atpId);

    const meeting = await prisma.aTPMeeting.findFirst({ where: { id: meetingId, atpId } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
    }

    const updated = await prisma.aTPMeeting.update({
      where: { id: meetingId },
      data: { status: "published", publishedAt: new Date() },
    });

    res.json({ success: true, message: "Pertemuan berhasil dipublish.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// ══════════════════════════════════════════════
// MATERIAL ENDPOINTS
// ══════════════════════════════════════════════

// POST /api/atp/:atpId/meetings/:meetingId/materials/upload — upload file
router.post(
  "/:atpId/meetings/:meetingId/materials/upload",
  teacherGuard,
  atpOwnershipGuard,
  upload.single("file"),
  async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "File wajib diupload." });
      }

      const meetingId = Number(req.params.meetingId);
      const atpId = Number(req.params.atpId);

      const meeting = await prisma.aTPMeeting.findFirst({ where: { id: meetingId, atpId } });
      if (!meeting) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
      }

      const { title, order } = req.body;
      const fileType = mimeToType.get(req.file.mimetype) || "pdf";
      const fileUrl = `/uploads/atp-materials/${req.file.filename}`;

      const material = await prisma.aTPMaterial.create({
        data: {
          meetingId,
          title: title || req.file.originalname,
          type: fileType as any,
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          order: Number(order) || 0,
        },
      });

      res.status(201).json({ success: true, message: "Materi berhasil diupload.", data: material });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, message: error.message || "Terjadi kesalahan server." });
    }
  }
);

// POST /api/atp/:atpId/meetings/:meetingId/materials/link — tambah link
router.post("/:atpId/meetings/:meetingId/materials/link", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const { title, url, type = "link" } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, message: "Title dan URL wajib diisi." });
    }

    const meetingId = Number(req.params.meetingId);
    const atpId = Number(req.params.atpId);

    const meeting = await prisma.aTPMeeting.findFirst({ where: { id: meetingId, atpId } });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
    }

    const material = await prisma.aTPMaterial.create({
      data: { meetingId, title, type: type as any, fileUrl: url, order: 0 },
    });

    res.status(201).json({ success: true, message: "Link materi berhasil ditambahkan.", data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// DELETE /api/atp/:atpId/meetings/:meetingId/materials/:materialId — hapus materi
router.delete("/:atpId/meetings/:meetingId/materials/:materialId", teacherGuard, atpOwnershipGuard, async (req: any, res: Response) => {
  try {
    const materialId = Number(req.params.materialId);
    const material = await prisma.aTPMaterial.findUnique({ where: { id: materialId } });

    if (!material) {
      return res.status(404).json({ success: false, message: "Materi tidak ditemukan." });
    }

    // Hapus file fisik jika bukan URL eksternal
    if (!material.fileUrl.startsWith("http")) {
      const filePath = path.join(process.cwd(), material.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.aTPMaterial.delete({ where: { id: materialId } });
    res.json({ success: true, message: "Materi berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// POST /api/atp/:id/import-excel — import data meeting dari Excel
router.post("/:id/import-excel", teacherGuard, atpOwnershipGuard, upload.single("excel"), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File Excel wajib diupload." });
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require("xlsx");
    const wb = XLSX.readFile(req.file.path);
    // eslint-disable-next-line security/detect-object-injection
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);

    fs.unlinkSync(req.file.path);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "File Excel kosong." });
    }

    const atpId = Number(req.params.id);
    let updatedCount = 0;

    for (const row of rows) {
      const meetingNumber = Number(row["No Pertemuan"]);
      if (!meetingNumber || meetingNumber < 1) continue;

      const meeting = await prisma.aTPMeeting.findFirst({ where: { atpId, meetingNumber } });
      if (meeting) {
        await prisma.aTPMeeting.update({
          where: { id: meeting.id },
          data: {
            title: row["Judul Pertemuan"] || meeting.title,
            learningPath: row["Alur Pembelajaran"] || null,
            learningGoal: row["Tujuan Pembelajaran"] || null,
            activity: row["Aktivitas"] || null,
            assessment: row["Penilaian"] || null,
          },
        });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Import berhasil. ${updatedCount} pertemuan diperbarui.`,
      data: { updatedCount },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: "Gagal import Excel." });
  }
});

export default router;
