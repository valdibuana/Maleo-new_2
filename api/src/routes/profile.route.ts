import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { validate } from "../middleware/validate";
import bcrypt from "bcryptjs";

const router = Router();

/**
 * Validasi skema untuk update profil
 */
const updateProfileSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").optional(),
  email: z.string().email("Format email tidak valid").optional(),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
});

// GET /api/profile
// Mengambil data profil user yang sedang login
router.get("/", verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userCode: true,
        nipNis: true,
        createdAt: true,
        student: true,
        teacher: true,
        principal: true,
        guardian: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User tidak ditemukan" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("[Profile] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// PUT /api/profile
// Memperbarui profil user yang sedang login
router.put("/", verifyJWT, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User tidak ditemukan" });
      return;
    }

    // Cek apakah email sudah digunakan oleh user lain
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
      });
      if (existing) {
        res.status(400).json({ success: false, message: "Email sudah digunakan" });
        return;
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const transaction: any[] = [];

    // 1. Update tabel User
    transaction.push(
      prisma.user.update({
        where: { id: userId },
        data: updateData,
      })
    );

    // 2. Update tabel spesifik berdasarkan role
    if (name || email) {
      if (user.studentId && name) {
        transaction.push(
          prisma.student.update({
            where: { id: user.studentId },
            data: { name },
          })
        );
      }

      if (user.teacherId) {
        const teacherUpdate: any = {};
        if (name) teacherUpdate.name = name;
        if (email) teacherUpdate.email = email;
        transaction.push(
          prisma.teacher.update({
            where: { id: user.teacherId },
            data: teacherUpdate,
          })
        );
      }

      if (user.principalId) {
        const principalUpdate: any = {};
        if (name) principalUpdate.name = name;
        if (email) principalUpdate.email = email;
        transaction.push(
          prisma.principal.update({
            where: { id: user.principalId },
            data: principalUpdate,
          })
        );
      }

      if (user.guardianId) {
        const guardianUpdate: any = {};
        if (name) guardianUpdate.name = name;
        if (email) guardianUpdate.email = email;
        transaction.push(
          prisma.guardian.update({
            where: { id: user.guardianId },
            data: guardianUpdate,
          })
        );
      }
    }

    await prisma.$transaction(transaction);

    // Ambil data user terbaru untuk dikembalikan
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({ success: true, message: "Profil berhasil diperbarui", data: updatedUser });
  } catch (error) {
    console.error("[Profile] PUT error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server saat memperbarui profil" });
  }
});

export default router;
