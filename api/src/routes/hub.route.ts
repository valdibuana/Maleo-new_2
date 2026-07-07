import { Router, Request, Response } from "express";
import path from "path";
import { AnnouncementTarget } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { uploadMaterial } from "../lib/multer";

const router = Router();

/**
 * Middleware untuk mendapatkan identitas tambahan (teacherId atau studentId & classId)
 * berdasarkan role user yang sedang login.
 */
const identityGuard = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { nipNis: true, role: true, teacherId: true, studentId: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Profil user tidak ditemukan." });
    }

    if (user.role !== "teacher" && user.role !== "student") {
      return next();
    }

    if (user.role === "teacher") {
      if (user.teacherId) {
        (req as any).teacherId = user.teacherId;
      } else if (user.nipNis) {
        const teacher = await prisma.teacher.findUnique({ where: { nip: user.nipNis } });
        if (!teacher) return res.status(403).json({ success: false, message: "Profil guru tidak ditemukan atau telah dihapus." });
        (req as any).teacherId = teacher.id;
      } else {
        return res.status(404).json({ success: false, message: "Profil guru tidak lengkap." });
      }
    } else if (user.role === "student") {
      if (user.studentId) {
        const student = await prisma.student.findUnique({ where: { id: user.studentId } });
        if (!student) return res.status(403).json({ success: false, message: "Profil siswa tidak ditemukan atau telah dihapus." });
        (req as any).studentId = student.id;
        (req as any).classId = student.classId;
      } else if (user.nipNis) {
        const student = await prisma.student.findUnique({ where: { nis: user.nipNis } });
        if (!student) return res.status(403).json({ success: false, message: "Profil siswa tidak ditemukan atau telah dihapus." });
        (req as any).studentId = student.id;
        (req as any).classId = student.classId;
      } else {
        return res.status(404).json({ success: false, message: "Profil siswa tidak lengkap." });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan identitas." });
  }
};

router.use(verifyJWT);
router.use(identityGuard);

const isHubRole = (role: string) => role === "teacher" || role === "student";

// 1. GET /api/hub/dashboard
router.get("/dashboard", async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const today = new Date();
    const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][today.getDay()];

    let stats = { subjects: 0, activeAssignments: 0, attendanceRate: 100, averageGrade: 0 };
    let schedules: any[] = [];

    if (role === "teacher") {
      const teacherId = req.teacherId;
      const [subjectCount, assignmentCount, daySchedules, grades] = await Promise.all([
        prisma.subject.count({ where: { teacherId } }),
        prisma.assignment.count({ where: { teacherId, dueDate: { gte: today } } }),
        prisma.schedule.findMany({
          where: { teacherId, day: dayName },
          include: { class: true, subject: true },
          orderBy: { startTime: "asc" }
        }),
        prisma.grade.findMany({
          where: { subject: { teacherId } },
          select: { score: true }
        })
      ]);
      const averageGrade = grades.length > 0
        ? grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
        : 0;
      stats = { 
        subjects: subjectCount, 
        activeAssignments: assignmentCount, 
        attendanceRate: 98, 
        averageGrade 
      };
      schedules = daySchedules;
    } else if (role === "student") {
      const classId = req.classId;
      const studentId = req.studentId;
      const [assignmentCount, daySchedules, grades, attendances] = await Promise.all([
        prisma.assignment.count({ where: { classId, dueDate: { gte: today } } }),
        prisma.schedule.findMany({
          where: { classId, day: dayName },
          include: { teacher: true, subject: true },
          orderBy: { startTime: "asc" }
        }),
        prisma.grade.findMany({
          where: { studentId },
          select: { score: true }
        }),
        prisma.attendance.findMany({ where: { studentId, date: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } })
      ]);
      
      const presentCount = attendances.filter(a => a.status === 'hadir').length;
      const attRate = attendances.length > 0 ? (presentCount / attendances.length) * 100 : 100;
      const averageGrade = grades.length > 0
        ? grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
        : 0;

      stats = { 
        subjects: 0,
        activeAssignments: assignmentCount, 
        attendanceRate: Math.round(attRate), 
        averageGrade 
      };
      schedules = daySchedules;
    }

    res.json({
      success: true,
      data: {
        stats,
        todaySchedules: schedules.map((s: any) => ({
          time: `${s.startTime} - ${s.endTime}`,
          subject: s.subject.name,
          class: s.class?.name || "Semua",
          teacher: s.teacher?.name || "",
          room: s.room
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data dashboard." });
  }
});

// 2. GET /api/hub/announcements
router.get("/announcements", async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    let targets: AnnouncementTarget[] = [AnnouncementTarget.all];

    if (role === "student") {
      targets.push(AnnouncementTarget.student);
    } else if (role === "teacher") {
      targets.push(AnnouncementTarget.teacher);
    } else if (role === "guardian") {
      targets.push(AnnouncementTarget.guardian);
    } else if (["admin", "kepala_sekolah"].includes(role || "")) {
      targets = [
        AnnouncementTarget.all,
        AnnouncementTarget.student,
        AnnouncementTarget.teacher,
        AnnouncementTarget.guardian,
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        target: { in: targets },
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil pengumuman." });
  }
});

// 3. GET & POST /api/hub/contents
router.get("/contents", async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    if (!isHubRole(role)) {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    let where: any;

    if (role === "teacher") {
      where = { teacherId: req.teacherId };
    } else {
      where = { classId: req.classId };
    }

    const contents = await prisma.content.findMany({
      where,
      include: { 
        teacher: { select: { name: true } }, 
        subject: { select: { name: true } },
        class: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data: contents });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data materi." });
  }
});

router.post("/contents", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak: Hanya Guru yang dapat mengunggah data." });
    }
    const { title, type, url, classId, subjectId } = req.body;
    const content = await prisma.content.create({
      data: { title, type, url, teacherId: req.teacherId, classId: Number(classId), subjectId: Number(subjectId) }
    });
    res.status(201).json({ success: true, message: "Materi berhasil diunggah", data: content });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengunggah materi." });
  }
});

// 4. GET & POST /api/hub/assignments
router.get("/assignments", async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    if (!isHubRole(role)) {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    let where: any;

    if (role === "teacher") {
      where = { teacherId: req.teacherId };
    } else {
      where = { classId: req.classId };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        teacher: { select: { name: true } },
        subject: { select: { name: true } },
        class: {
          select: {
            name: true,
            _count: { select: { students: true } }
          }
        },
        _count: { select: { submissions: true } }
      },
      orderBy: { dueDate: "asc" }
    });

    // Untuk murid, ambil submission miliknya sekaligus
    let studentSubmissions: Map<number, any> = new Map();
    if (role === "student" && req.studentId) {
      const subs = await prisma.assignmentSubmission.findMany({
        where: { studentId: req.studentId }
      });
      subs.forEach(s => studentSubmissions.set(s.assignmentId, s));
    }

    const result = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      fileUrl: a.fileUrl,
      fileType: a.fileType,
      teacher: a.teacher,
      subject: { id: a.subjectId, name: a.subject.name },
      class: { id: a.classId, name: a.class.name },
      totalStudents: a.class._count.students,
      submittedCount: a._count.submissions,
      // Data submission murid ini (jika role student)
      studentSubmission: role === "student" ? (
        studentSubmissions.has(a.id)
          ? { ...studentSubmissions.get(a.id), submitted: true }
          : { submitted: false }
      ) : undefined,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data tugas." });
  }
});


router.post("/assignments", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak: Hanya Guru yang dapat membuat tugas." });
    }
    const { title, description, dueDate, classId, subjectId, fileUrl, fileType } = req.body;
    const assignment = await prisma.assignment.create({
      data: {
        title, description, dueDate: new Date(dueDate),
        fileUrl, fileType,
        teacherId: req.teacherId, classId: Number(classId), subjectId: Number(subjectId)
      }
    });
    res.status(201).json({ success: true, message: "Tugas berhasil dibuat", data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal membuat tugas." });
  }
});

router.post("/assignments/upload", uploadMaterial.single("file"), async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Tidak ada file yang diunggah." });
    }

    const fileUrl = `/uploads/materials/${req.file.filename}`;
    const fileType = path.extname(req.file.originalname).replace(".", "").toLowerCase();

    res.json({ success: true, fileUrl, fileType });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengunggah file." });
  }
});

router.put("/assignments/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const { title, description, dueDate, classId, subjectId, fileUrl, fileType } = req.body;
    const assignmentId = Number(req.params.id);

    // Pastikan tugas ini milik guru yang login
    const existing = await prisma.assignment.findFirst({
      where: { id: assignmentId, teacherId: req.teacherId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        classId: Number(classId),
        subjectId: Number(subjectId),
        fileUrl,
        fileType,
      }
    });

    res.json({ success: true, message: "Tugas berhasil diperbarui", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memperbarui tugas." });
  }
});

router.delete("/assignments/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const assignmentId = Number(req.params.id);

    // Pastikan tugas ini milik guru yang login
    const existing = await prisma.assignment.findFirst({
      where: { id: assignmentId, teacherId: req.teacherId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });

    res.json({ success: true, message: "Tugas berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghapus tugas." });
  }
});

router.get("/assignments/:id", async (req: any, res: Response) => {
  try {
    const assignmentId = Number(req.params.id);
    const { role } = req.user;
    if (!isHubRole(role)) {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        teacher: { select: { name: true } },
        subject: { select: { id: true, name: true } },
        class: {
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } }
          }
        },
        _count: { select: { submissions: true } }
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
    }

    if (role === "student" && assignment.class.id !== req.classId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke tugas ini." });
    }

    if (role === "teacher" && assignment.teacherId !== req.teacherId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke tugas ini." });
    }

    // Jika murid, ambil submission miliknya
    let studentSubmission: any = undefined;
    if (role === "student" && req.studentId) {
      const sub = await prisma.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: req.studentId } }
      });
      studentSubmission = sub ? { ...sub, submitted: true } : { submitted: false };
    }

    // Jika guru, ambil semua submissions
    let submissions: any = undefined;
    if (role === "teacher") {
      submissions = await prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        include: { student: { select: { name: true, nis: true } } },
        orderBy: { submittedAt: "desc" }
      });
    }

    res.json({
      success: true,
      data: {
        ...assignment,
        totalStudents: assignment.class._count.students,
        submittedCount: assignment._count.submissions,
        studentSubmission,
        submissions,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil detail tugas." });
  }
});

// ── SUBMISSION MURID ──────────────────────────────────────────
// POST /api/hub/assignments/:id/submit — kumpulkan tugas (murid)
router.post("/assignments/:id/submit", uploadMaterial.single("file"), async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Hanya siswa yang dapat mengumpulkan tugas." });
    }

    const assignmentId = Number(req.params.id);
    const studentId = req.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: "Profil siswa tidak ditemukan." });
    }

    // Pastikan tugas ada dan ditujukan ke kelas siswa ini
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, classId: req.classId }
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Tugas tidak ditemukan atau bukan untuk kelas Anda." });
    }

    // Cek apakah sudah ada submission sebelumnya
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Anda sudah mengumpulkan tugas ini. Gunakan endpoint update untuk mengubahnya." });
    }

    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileName: string | undefined;

    if (req.file) {
      fileUrl = `/uploads/materials/${req.file.filename}`;
      fileType = path.extname(req.file.originalname).replace(".", "").toLowerCase();
      fileName = req.file.originalname;
    }

    const { content } = req.body;

    if (!req.file && !content) {
      return res.status(400).json({ success: false, message: "Harap unggah file atau tulis jawaban teks." });
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId,
        fileUrl,
        fileType,
        fileName,
        content: content || null,
        submittedAt: new Date(),
      }
    });

    res.status(201).json({ success: true, message: "Tugas berhasil dikumpulkan!", data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengumpulkan tugas." });
  }
});

// PUT /api/hub/assignments/submit/:submissionId — update submission (murid)
router.put("/assignments/submit/:submissionId", uploadMaterial.single("file"), async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Hanya siswa yang dapat mengubah tugas." });
    }

    const submissionId = Number(req.params.submissionId);
    const studentId = req.studentId;

    const existing = await prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, studentId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Submission tidak ditemukan." });
    }

    let fileUrl = existing.fileUrl ?? undefined;
    let fileType = existing.fileType ?? undefined;
    let fileName = existing.fileName ?? undefined;

    if (req.file) {
      fileUrl = `/uploads/materials/${req.file.filename}`;
      fileType = path.extname(req.file.originalname).replace(".", "").toLowerCase();
      fileName = req.file.originalname;
    }

    const { content } = req.body;

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        fileUrl,
        fileType,
        fileName,
        content: content ?? existing.content,
        submittedAt: new Date(),
      }
    });

    res.json({ success: true, message: "Tugas berhasil diperbarui.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memperbarui tugas." });
  }
});

// DELETE /api/hub/assignments/submit/:submissionId — hapus submission (murid)
router.delete("/assignments/submit/:submissionId", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Hanya siswa yang dapat menghapus submission." });
    }

    const submissionId = Number(req.params.submissionId);
    const studentId = req.studentId;

    const existing = await prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, studentId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Submission tidak ditemukan." });
    }

    await prisma.assignmentSubmission.delete({ where: { id: submissionId } });
    res.json({ success: true, message: "Submission berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghapus submission." });
  }
});

// GET /api/hub/assignments/:id/submissions — guru lihat semua submission suatu tugas
router.get("/assignments/:id/submissions", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Hanya guru yang dapat melihat semua submission." });
    }

    const assignmentId = Number(req.params.id);

    // Pastikan tugas milik guru ini
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, teacherId: req.teacherId }
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { name: true, nis: true } }
      },
      orderBy: { submittedAt: "desc" }
    });

    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data submission." });
  }
});

// GET /api/hub/teacher-classes → kelas yang diajar guru ini
router.get("/teacher-classes", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const teacherId = req.teacherId;

    // 1. Ambil kelas dari jadwal guru
    const schedules = await prisma.schedule.findMany({
      where: { teacherId },
      select: { class: { select: { id: true, name: true } } },
      distinct: ['classId']
    });

    // 2. Ambil kelas di mana guru adalah wali kelas
    const homeroomClasses = await prisma.class.findMany({
      where: { homeroomTeacherId: teacherId },
      select: { id: true, name: true }
    });

    // 3. Ambil kelas berdasarkan tingkatan mata pelajaran yang diajar
    const subjects = await prisma.subject.findMany({
      where: { teacherId },
      select: { gradeLevel: true }
    });
    const gradeLevels = subjects.map(s => s.gradeLevel);
    
    const subjectLevelClasses = await prisma.class.findMany({
      where: { level: { in: gradeLevels } },
      select: { id: true, name: true }
    });

    // Gabungkan semua dan hilangkan duplikat
    const classMap = new Map();
    schedules.forEach(s => {
      if (s.class) classMap.set(s.class.id, s.class);
    });
    homeroomClasses.forEach(c => {
      classMap.set(c.id, c);
    });
    subjectLevelClasses.forEach(c => {
      classMap.set(c.id, c);
    });

    const result = Array.from(classMap.values());
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data kelas." });
  }
});

// GET /api/hub/teacher-subjects → mata pelajaran yang diajar guru ini
router.get("/teacher-subjects", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const subjects = await prisma.subject.findMany({
      where: { teacherId: req.teacherId },
      select: { id: true, name: true }
    });

    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data mata pelajaran." });
  }
});

// 5. GET /api/hub/student-subjects → mapel siswa berdasarkan kelas
router.get("/student-subjects", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Akses ditolak. Hanya untuk Siswa." });
    }

    const classId = req.classId;
    if (!classId) {
      return res.status(400).json({ success: false, message: "Data kelas siswa tidak ditemukan." });
    }

    // Ambil subjects unik dari jadwal kelas ini
    const schedules = await prisma.schedule.findMany({
      where: { classId },
      select: {
        subject: { select: { id: true, name: true } }
      },
      distinct: ['subjectId']
    });

    const subjects = schedules
      .map(s => s.subject)
      .filter((s): s is NonNullable<typeof s> => s !== null);

    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil mata pelajaran." });
  }
});

// 6. GET /api/hub/grades → nilai siswa atau siswa yang diajar guru
router.get("/grades", async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const { subjectId, classId, type } = req.query;
    let grades: any[] = [];

    if (role === "student") {
      const where: any = { studentId: req.studentId };
      if (subjectId) where.subjectId = Number(subjectId);
      if (type) where.type = type;

      grades = await prisma.grade.findMany({
        where,
        include: {
          subject: { select: { name: true } }
        },
        orderBy: { date: 'desc' }
      });
    } else if (role === "teacher") {
      const where: any = { subject: { teacherId: req.teacherId } };
      if (subjectId) where.subjectId = Number(subjectId);
      if (classId) where.student = { classId: Number(classId) };
      if (type) where.type = type;

      grades = await prisma.grade.findMany({
        where,
        include: {
          subject: { select: { name: true } },
          student: {
            select: {
              name: true,
              nis: true,
              class: { select: { name: true } }
            }
          }
        },
        orderBy: { date: 'desc' }
      });
    } else {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data nilai." });
  }
});

// POST /api/hub/grades → input nilai (guru only)
router.post("/grades", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak. Hanya untuk Guru." });
    }

    const { studentId, subjectId, type, score, maxScore, date } = req.body;

    if (!studentId || !subjectId || !type || score === undefined) {
      return res.status(400).json({ success: false, message: "Field studentId, subjectId, type, dan score wajib diisi." });
    }

    // Pastikan subject milik guru ini
    const subject = await prisma.subject.findFirst({
      where: { id: Number(subjectId), teacherId: req.teacherId }
    });
    if (!subject) {
      return res.status(403).json({ success: false, message: "Mata pelajaran tidak valid atau bukan milik Anda." });
    }

    const grade = await prisma.grade.create({
      data: {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        type,
        score: Number(score),
        maxScore: maxScore ? Number(maxScore) : 100,
        date: date ? new Date(date) : new Date()
      }
    });

    res.status(201).json({ success: true, message: "Nilai berhasil disimpan.", data: grade });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menyimpan nilai." });
  }
});

// DELETE /api/hub/grades/:id → hapus nilai (guru only)
router.delete("/grades/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const gradeId = Number(req.params.id);
    const existing = await prisma.grade.findFirst({
      where: { id: gradeId, subject: { teacherId: req.teacherId } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Nilai tidak ditemukan." });
    }

    if (existing.isLocked) {
      return res.status(403).json({ success: false, message: "Nilai sudah dikunci. Hubungi admin untuk membuka kunci." });
    }

    await prisma.grade.delete({ where: { id: gradeId } });
    res.json({ success: true, message: "Nilai berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghapus nilai." });
  }
});

// POST /api/hub/grades/:id/lock → lock nilai (guru only)
router.post("/grades/:id/lock", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const gradeId = Number(req.params.id);
    const existing = await prisma.grade.findFirst({
      where: { id: gradeId, subject: { teacherId: req.teacherId } }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Nilai tidak ditemukan." });
    }

    if (existing.isLocked) {
      return res.status(400).json({ success: false, message: "Nilai sudah terkunci." });
    }

    const updated = await prisma.grade.update({
      where: { id: gradeId },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: req.user.id
      }
    });

    res.json({ success: true, message: "Nilai berhasil dikunci.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengunci nilai." });
  }
});

// GET /api/hub/attendance-summary → rekap kehadiran siswa bulan ini
router.get("/attendance-summary", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Akses ditolak. Hanya untuk Siswa." });
    }

    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? Number(month) - 1 : now.getMonth();
    const targetYear = year ? Number(year) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: req.studentId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    const summary = {
      hadir: attendances.filter(a => a.status === 'hadir').length,
      izin: attendances.filter(a => a.status === 'izin').length,
      sakit: attendances.filter(a => a.status === 'sakit').length,
      alpa: attendances.filter(a => a.status === 'alpa').length,
      total: attendances.length
    };

    const presentRate = summary.total > 0
      ? Math.round(((summary.hadir + summary.izin + summary.sakit) / summary.total) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        summary,
        presentRate,
        records: attendances,
        month: targetMonth + 1,
        year: targetYear
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data kehadiran." });
  }
});

// 7. GET /api/hub/schedules
router.get("/schedules", async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    if (!isHubRole(role)) {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    let where: any;

    if (role === "teacher") {
      where = { teacherId: req.teacherId };
    } else {
      where = { classId: req.classId };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: { 
        subject: { select: { name: true } }, 
        teacher: { select: { name: true } }, 
        class: { select: { name: true } } 
      },
      orderBy: [
        { day: "asc" },
        { startTime: "asc" }
      ]
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error("[Hub] Schedules error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data jadwal." });
  }
});

// GET /api/hub/consultations
// → guru lihat semua thread konsultasi yang masuk
router.get("/consultations", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const consultations = await prisma.consultation.findMany({
      where: {
        parentId: null,
        receiverId: req.user.id
      },
      include: {
        replies: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        _count: { select: { replies: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: consultations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil konsultasi." });
  }
});

// GET /api/hub/consultations/:id
// → guru buka detail thread
router.get("/consultations/:id", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: Number(req.params.id) },
      include: { replies: { orderBy: { createdAt: "asc" } } }
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: "Tidak ditemukan." });
    }

    if (consultation.receiverId !== req.user.id && consultation.senderId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    // Mark as read
    if (consultation.receiverId === req.user.id) {
      await prisma.consultation.update({
        where: { id: Number(req.params.id) },
        data: { status: "read" }
      });
    }

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal." });
  }
});

// POST /api/hub/consultations/:id/reply
// → guru reply ke thread wali murid
router.post("/consultations/:id/reply", async (req: any, res: Response) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const { message } = req.body;
    const parent = await prisma.consultation.findUnique({
      where: { id: Number(req.params.id) }
    });

    if (!parent) {
      return res.status(404).json({ success: false, message: "Thread tidak ditemukan." });
    }

    if (parent.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke thread ini." });
    }

    const reply = await prisma.consultation.create({
      data: {
        senderId: req.user.id,
        receiverId: parent.senderId,
        senderRole: "teacher",
        subject: parent.subject,
        message,
        parentId: parent.id,
        status: "unread"
      }
    });

    await prisma.consultation.update({
      where: { id: parent.id },
      data: { status: "replied" }
    });

    res.status(201).json({ success: true, message: "Balasan terkirim.", data: reply });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengirim balasan." });
  }
});

export default router;
