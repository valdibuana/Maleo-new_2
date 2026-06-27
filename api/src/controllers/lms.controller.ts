import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import path from "path";
import fs from "fs";

// ──────────────────────────────────────────────
// FILTER DATA (FOR DROPDOWNS)
// ──────────────────────────────────────────────

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId, role } = req.user!;
    console.log("[LMS] Fetching subjects for user:", userId, "Role:", role);

    if (role !== "teacher") {
       // Students and Guardians see subjects related to their modules, 
       // but for the filter dropdown, let's keep it simple or based on their class
       return res.json({ success: true, data: [] });
    }

    const teacher = await prisma.teacher.findFirst({
      where: { user: { id: userId } },
      include: { subjects: { select: { id: true, name: true, code: true } } }
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Profil guru tidak ditemukan" });
    }

    res.json({ success: true, data: teacher.subjects });
  } catch (error) {
    console.error("[LMS] getSubjects error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data mata pelajaran" });
  }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId, role } = req.user!;
    
    if (role !== "teacher") return res.json({ success: true, data: [] });

    const teacher = await prisma.teacher.findFirst({
      where: { user: { id: userId } },
      include: { 
        homeroomClasses: { select: { id: true, name: true, level: true } },
        schedules: { select: { class: { select: { id: true, name: true, level: true } } }, distinct: ['classId'] },
        teacherSubjects: { include: { subject: { select: { id: true, gradeLevel: true } } } }
      }
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Profil guru tidak ditemukan" });
    }

    // Combine homeroom and scheduled classes
    const classesMap = new Map();
    teacher.homeroomClasses.forEach(c => classesMap.set(c.id, c));
    teacher.schedules.forEach(s => classesMap.set(s.class.id, s.class));

    // Include classes from the grade levels they are assigned to teach
    const gradeLevels = Array.from(new Set(teacher.teacherSubjects.map((ts: any) => ts.subject.gradeLevel)));
    if (gradeLevels.length > 0) {
      const subjectClasses = await prisma.class.findMany({
        where: { level: { in: gradeLevels } },
        select: { id: true, name: true, level: true }
      });
      subjectClasses.forEach((c: any) => classesMap.set(c.id, c));
    }

    res.json({ success: true, data: Array.from(classesMap.values()) });
  } catch (error) {
    console.error("[LMS] getClasses error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data kelas" });
  }
};

// ──────────────────────────────────────────────
// MODULES
// ──────────────────────────────────────────────

export const getModules = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, academicYearId, classId } = req.query;
    const { id: userId, role } = req.user!;
    console.log(`[LMS] getModules for User: ${userId}, Role: ${role}`);

    const where: any = {};
    if (subjectId) where.subjectId = Number(subjectId);
    if (academicYearId) where.academicYearId = Number(academicYearId);

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({
        where: { user: { id: userId } }
      });
      if (!teacher) {
        return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
      }
      where.teacherId = teacher.id;
      if (classId) where.classId = Number(classId);
    } else if (role === "student") {
      const student = await prisma.student.findFirst({
        where: { user: { id: userId } }
      });
      if (student) {
        // Siswa bisa melihat modul untuk kelasnya ATAU modul global (classId null)
        where.OR = [
          { classId: student.classId, isPublished: true },
          { classId: null, isPublished: true },
        ];
      }
    } else if (role === "guardian") {
      const guardian = await prisma.guardian.findFirst({
        where: { user: { id: userId } },
        include: { students: { select: { classId: true } } }
      });
      if (guardian) {
        const classIds = guardian.students.map(s => s.classId);
        where.classId = { in: classIds };
        where.isPublished = true;
      }
    }

    const modules = await prisma.learningModule.findMany({
      where,
      include: {
        sessions: {
          where: (role === "student" || role === "guardian") ? { isPublished: true } : {},
          include: {
            materials: {
              orderBy: { order: "asc" },
              include: role === "teacher" ? { _count: { select: { access: true } } } : undefined
            }
          },
          orderBy: { sessionNumber: "asc" }
        },
        subject: { select: { name: true } },
        teacher: { select: { name: true } },
        class: { select: { name: true } }
      },
      orderBy: { order: "asc" }
    });

    res.json({ success: true, data: modules });
  } catch (error) {
    console.error("[LMS] getModules error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data modul." });
  }
};

export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, subjectId, academicYearId, classId, order } = req.body;
    const { id: userId } = req.user!;

    if (!subjectId || !academicYearId) {
      return res.status(400).json({ success: false, message: "Mata pelajaran dan Tahun Akademik wajib dipilih." });
    }

    const teacher = await prisma.teacher.findFirst({ 
      where: { user: { id: userId } }, 
      include: { 
        subjects: true,
        homeroomClasses: true,
        schedules: { select: { classId: true } }
      } 
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Guru tidak ditemukan." });
    }

    // Hard Security: Verify teacher teaches this subject
    const teachesSubject = teacher.subjects.some(s => s.id === Number(subjectId));
    if (!teachesSubject) {
      return res.status(403).json({ 
        success: false, 
        message: "Anda tidak memiliki akses ke mata pelajaran ini." 
      });
    }

    // Optional Security: If classId is provided, verify teacher teaches in that class
    if (classId) {
      const teachesInClass = teacher.schedules.some(s => s.classId === Number(classId)) || 
                             teacher.homeroomClasses.some(c => c.id === Number(classId));
      if (!teachesInClass) {
        return res.status(403).json({ 
          success: false, 
          message: "Anda tidak memiliki akses ke kelas ini." 
        });
      }
    }

    const module = await prisma.learningModule.create({
      data: {
        title,
        description,
        subjectId: Number(subjectId),
        academicYearId: Number(academicYearId),
        classId: classId ? Number(classId) : null,
        teacherId: teacher.id,
        order: order || 0
      }
    });

    res.status(201).json({ success: true, data: module });
  } catch (error: any) {
    console.error("[LMS] createModule error:", error);
    res.status(500).json({ success: false, message: "Gagal membuat modul." });
  }
};

export const updateModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, order, isPublished } = req.body;
    const { id: userId, role } = req.user!;

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({ where: { user: { id: userId } } });
      const module = await prisma.learningModule.findUnique({ where: { id: Number(id) } });
      if (!teacher || module?.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke modul ini." });
      }
    }

    const module = await prisma.learningModule.update({
      where: { id: Number(id) },
      data: { title, description, order, isPublished }
    });

    res.json({ success: true, data: module });
  } catch (error) {
    console.error("[LMS] updateModule error:", error);
    res.status(500).json({ success: false, message: "Gagal memperbarui modul." });
  }
};

export const deleteModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user!;

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({ where: { user: { id: userId } } });
      const module = await prisma.learningModule.findUnique({ where: { id: Number(id) } });
      if (!teacher || module?.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke modul ini." });
      }
    }

    await prisma.learningModule.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: "Modul berhasil dihapus." });
  } catch (error) {
    console.error("[LMS] deleteModule error:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus modul." });
  }
};

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId, title, sessionNumber, isRepeatable, isPublished } = req.body;
    const { id: userId, role } = req.user!;

    // Validation
    const module = await prisma.learningModule.findUnique({ where: { id: Number(moduleId) } });
    if (!module) return res.status(404).json({ success: false, message: "Modul tidak ditemukan." });

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({ where: { user: { id: userId } } });
      if (!teacher || module.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke modul ini." });
      }
    }

    const session = await prisma.moduleSession.create({
      data: {
        moduleId: Number(moduleId),
        title,
        sessionNumber: Number(sessionNumber),
        isRepeatable: !!isRepeatable,
        isPublished: !!isPublished
      }
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error("[LMS] createSession error:", error);
    res.status(500).json({ success: false, message: "Gagal membuat sesi pertemuan." });
  }
};

export const updateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, sessionNumber, isRepeatable, isPublished } = req.body;
    const { id: userId, role } = req.user!;

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({ where: { user: { id: userId } } });
      const session = await prisma.moduleSession.findUnique({
        where: { id: Number(id) },
        include: { module: true }
      });
      if (!teacher || session?.module.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke sesi ini." });
      }
    }

    const session = await prisma.moduleSession.update({
      where: { id: Number(id) },
      data: { title, sessionNumber, isRepeatable, isPublished }
    });

    res.json({ success: true, data: session });
  } catch (error) {
    console.error("[LMS] updateSession error:", error);
    res.status(500).json({ success: false, message: "Gagal memperbarui sesi." });
  }
};

export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user!;

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({ where: { user: { id: userId } } });
      const session = await prisma.moduleSession.findUnique({
        where: { id: Number(id) },
        include: { module: true }
      });
      if (!teacher || session?.module.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke sesi ini." });
      }
    }

    await prisma.moduleSession.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: "Sesi berhasil dihapus." });
  } catch (error) {
    console.error("[LMS] deleteSession error:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus sesi." });
  }
};

export const uploadMaterialFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Tidak ada file yang diunggah." });
    }

    const { sessionId, title, type, order } = req.body;
    const fileUrl = `/uploads/materials/${req.file.filename}`;

    const material = await prisma.sessionMaterial.create({
      data: {
        sessionId: Number(sessionId),
        title,
        type: type as any,
        fileUrl,
        order: order ? Number(order) : 0
      }
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    console.error("[LMS] uploadMaterialFile error:", error);
    res.status(500).json({ success: false, message: "Gagal mengunggah materi." });
  }
};

export const createLinkMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, title, type, fileUrl, order } = req.body;

    if (type !== 'link') {
      return res.status(400).json({ success: false, message: "Tipe harus berupa link." });
    }

    const material = await prisma.sessionMaterial.create({
      data: {
        sessionId: Number(sessionId),
        title,
        type: 'link',
        fileUrl,
        order: order ? Number(order) : 0
      }
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    console.error("[LMS] createLinkMaterial error:", error);
    res.status(500).json({ success: false, message: "Gagal menyimpan tautan." });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user!;

    const material = await prisma.sessionMaterial.findUnique({
      where: { id: Number(id) },
      include: { session: { include: { module: true } } }
    });

    if (!material) return res.status(404).json({ success: false, message: "Materi tidak ditemukan." });

    if (role === "teacher") {
      const teacher = await prisma.teacher.findFirst({ where: { user: { id: userId } } });
      if (!teacher || material.session.module.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk menghapus materi ini." });
      }
    }

    // Delete file from disk
    const filePath = path.join(__dirname, "../../", material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.sessionMaterial.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: "Materi berhasil dihapus." });
  } catch (error) {
    console.error("[LMS] deleteMaterial error:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus materi." });
  }
};

export const trackAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id: materialId } = req.params;
    const { id: userId, role } = req.user!;

    if (role !== "student") {
      console.error("[LMS] trackAccess: Non-student role attempted to track access", { userId, role });
      return res.status(403).json({ success: false, message: "Hanya siswa yang dapat merekam akses materi." });
    }

    const student = await prisma.student.findFirst({ where: { user: { id: userId } } });
    if (!student) {
      console.error("[LMS] trackAccess: Student profile not found", { userId });
      return res.status(404).json({ success: false, message: "Profil siswa tidak ditemukan." });
    }

    await prisma.studentMaterialAccess.upsert({
      where: { 
        studentId_materialId: { 
          studentId: student.id, 
          materialId: Number(materialId) 
        } 
      },
      create: { 
        studentId: student.id, 
        materialId: Number(materialId) 
      },
      update: { 
        accessedAt: new Date() 
      }
    });

    res.json({ success: true, message: "Akses berhasil direkam." });
  } catch (error) {
    console.error("[LMS] trackAccess error:", error);
    res.status(500).json({ success: false, message: "Gagal merekam akses materi." });
  }
};

export const getMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.query;
    const materials = await prisma.sessionMaterial.findMany({
      where: { sessionId: sessionId ? Number(sessionId) : undefined },
      orderBy: { order: "asc" }
    });
    res.json({ success: true, data: materials });
  } catch (error) {
    console.error("[LMS] getMaterials error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data materi." });
  }
};
