import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { z } from "zod";

const router = Router();

// ──────────────────────────────────────────────
// GET /api/recycle-bin
// Akses: Admin
// ──────────────────────────────────────────────
router.get("/", verifyJWT, checkRole("admin"), async (req: Request, res: Response): Promise<any> => {
  try {
    const { type } = req.query;
    
    if (!type || !["student", "teacher", "guardian", "class", "subject"].includes(String(type))) {
      return res.status(400).json({ success: false, message: "Tipe data tidak valid" });
    }

    let data: any[] = [];
    
    if (type === "student") {
      data = await prisma.student.findMany({
        where: { deletedAt: { not: null } },
        include: { class: { select: { name: true } } },
        orderBy: { deletedAt: "desc" }
      });
    } else if (type === "teacher") {
      data = await prisma.teacher.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      });
    } else if (type === "guardian") {
      data = await prisma.guardian.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      });
    } else if (type === "class") {
      data = await prisma.class.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      });
    } else if (type === "subject") {
      data = await prisma.subject.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" }
      });
    }

    res.json({ 
      success: true, 
      data,
      meta: {
        note: "Data di Recycle Bin tidak dihapus otomatis. Lakukan Permanent Delete secara manual untuk data yang sudah tidak diperlukan.",
        totalItems: data.length
      }
    });
  } catch (error) {
    console.error("[Recycle Bin] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/recycle-bin/:type/:id/restore
// Akses: Admin
// ──────────────────────────────────────────────
router.put("/:type/:id/restore", verifyJWT, checkRole("admin"), async (req: Request, res: Response): Promise<any> => {
  try {
    const { type, id } = req.params;
    const numericId = Number(id);

    if (type === "student") {
      await prisma.student.update({ where: { id: numericId }, data: { deletedAt: null } });
    } else if (type === "teacher") {
      await prisma.teacher.update({ where: { id: numericId }, data: { deletedAt: null, status: "active" } });
    } else if (type === "guardian") {
      await prisma.guardian.update({ where: { id: numericId }, data: { deletedAt: null } });
    } else if (type === "class") {
      await prisma.class.update({ where: { id: numericId }, data: { deletedAt: null } });
    } else if (type === "subject") {
      await prisma.subject.update({ where: { id: numericId }, data: { deletedAt: null } });
    } else {
      return res.status(400).json({ success: false, message: "Tipe data tidak valid" });
    }

    res.json({ success: true, message: "Data berhasil dipulihkan." });
  } catch (error) {
    console.error("[Recycle Bin] Restore error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server saat memulihkan data" });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/recycle-bin/:type/:id/permanent
// Akses: Admin
// ──────────────────────────────────────────────
router.delete("/:type/:id/permanent", verifyJWT, checkRole("admin"), async (req: Request, res: Response): Promise<any> => {
  try {
    const { type, id } = req.params;
    const numericId = Number(id);
    const { confirmText } = req.body;

    if (confirmText !== "HAPUS PERMANEN") {
      return res.status(400).json({ success: false, message: "Teks konfirmasi tidak valid." });
    }

    // FK Checks before permanent delete
    if (type === "student") {
      const relatedData = await prisma.attendance.count({ where: { studentId: numericId } });
      const relatedGrades = await prisma.grade.count({ where: { studentId: numericId } });
      
      if (relatedData > 0 || relatedGrades > 0) {
        return res.status(400).json({
          success: false,
          message: `Tidak bisa hapus permanen: siswa ini masih punya ${relatedData} record kehadiran dan ${relatedGrades} nilai. Hubungi developer untuk hapus data terkait terlebih dahulu.`
        });
      }
      
      await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { studentId: numericId } });
        await tx.student.delete({ where: { id: numericId } });
      });

    } else if (type === "teacher") {
      const hasSubjects = await prisma.subject.count({ where: { teacherId: numericId } });
      const hasSchedules = await prisma.schedule.count({ where: { teacherId: numericId } });
      const hasHomeroom = await prisma.class.count({ where: { homeroomTeacherId: numericId } });
      
      if (hasSubjects > 0 || hasSchedules > 0 || hasHomeroom > 0) {
        return res.status(400).json({ 
          success: false,
          message: "Tidak bisa hapus permanen: guru masih terikat pada mapel, jadwal, atau wali kelas." 
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { teacherId: numericId } });
        await tx.teacher.delete({ where: { id: numericId } });
      });

    } else if (type === "guardian") {
      await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { guardianId: numericId } });
        await tx.guardian.delete({ where: { id: numericId } });
      });

    } else if (type === "class") {
      const studentCount = await prisma.student.count({ where: { classId: numericId } });
      const scheduleCount = await prisma.schedule.count({ where: { classId: numericId } });
      
      if (studentCount > 0 || scheduleCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Tidak bisa hapus permanen: kelas masih memiliki siswa atau jadwal."
        });
      }

      await prisma.class.delete({ where: { id: numericId } });

    } else if (type === "subject") {
      const scheduleCount = await prisma.schedule.count({ where: { subjectId: numericId } });
      const gradeCount = await prisma.grade.count({ where: { subjectId: numericId } });
      
      if (scheduleCount > 0 || gradeCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Tidak bisa hapus permanen: mapel masih memiliki jadwal atau nilai."
        });
      }

      await prisma.subject.delete({ where: { id: numericId } });
    } else {
      return res.status(400).json({ success: false, message: "Tipe data tidak valid" });
    }

    res.json({ success: true, message: "Data berhasil dihapus permanen." });
  } catch (error) {
    console.error("[Recycle Bin] Permanent Delete error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server saat menghapus permanen." });
  }
});

export default router;
