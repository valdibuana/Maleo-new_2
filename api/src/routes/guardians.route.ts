import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import bcrypt from "bcryptjs";
import { generateUniqueUserCode } from "../lib/userCode";
import { generateUniqueUsername } from "../lib/generateUsername";

const router = Router();

const guardianSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  phone: z.string().min(1, "Telepon wajib diisi"),
  email: z.string().email("Email tidak valid"),
  address: z.string().min(1, "Alamat wajib diisi"),
  occupation: z.string().min(1, "Pekerjaan wajib diisi"),
});

// GET /api/guardians
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { phone: { contains: String(search) } },
      ];
    }
    const guardians = await prisma.guardian.findMany({
      where,
      include: {
        students: { select: { id: true, name: true, class: { select: { name: true } } } },
        user: { select: { userCode: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = guardians.map((g) => ({
      id: g.id,
      name: g.name,
      phone: g.phone,
      email: g.email,
      address: g.address,
      occupation: g.occupation,
      userCode: (g as any).user?.userCode || null,
      children: g.students.map((s) => ({ id: s.id, name: s.name, className: (s as any).class?.name })),
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error("[Guardians] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// GET /api/guardians/:id
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    const guardian = await prisma.guardian.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        students: {
          select: { id: true, name: true, class: { select: { name: true } } },
        },
      },
    });
    if (!guardian) {
      res.status(404).json({ success: false, message: "Wali murid tidak ditemukan" });
      return;
    }
    res.json({ success: true, data: guardian });
  } catch (error) {
    console.error("[Guardians] GET by ID error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// POST /api/guardians
router.post(
  "/",
  verifyJWT,
  checkRole("admin"),
  validate(guardianSchema),
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const { name, email, phone } = data;

      // 1. Generate unique username dari nama
      const username = await generateUniqueUsername(name);

      // 2. Generate unique code dengan prefix (e.g. O001)
      let userCode = "";
      let isUnique = false;
      while (!isUnique) {
        const rawCode = await generateUniqueUserCode("guardian");
        userCode = `O${rawCode}`;
        const exists = await prisma.user.findFirst({ where: { userCode } });
        if (!exists) isUnique = true;
      }
      
      // 3. Generate default password (same as userCode)
      const defaultPassword = userCode;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      // 4. Transaction: buat Guardian dulu, dapat id-nya, baru buat User dengan guardianId FK
      const result = await prisma.$transaction(async (tx) => {
        const guardian = await tx.guardian.create({ data });

        await tx.user.create({
          data: {
            name,
            email, // EMAIL tetap disimpan sebagai data identitas
            nipNis: email, // kept for backward-compat (non-login purpose)
            username, // USERNAME untuk login (bukan email)
            userCode,
            password: hashedPassword,
            role: "guardian",
            force_change_password: true,
            guardianId: guardian.id,
          },
        });

        // Coba ambil nama anak yang sudah di-link (jika ada)
        const linkedStudent = await tx.student.findFirst({
          where: { guardians: { some: { id: guardian.id } } },
          select: { name: true }
        });

        return { guardian, username, linkedStudent };
      });

      res.status(201).json({ 
        success: true, 
        message: `Wali murid "${result.guardian.name}" berhasil ditambahkan.
Email: ${result.guardian.email} (data kontak).
Login menggunakan Username: "${result.username}".
Password: ${defaultPassword}`, 
        data: {
          ...result.guardian,
          loginUsername: result.username,
          disambiguationHint: result.linkedStudent?.name || "-"
        }
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        // Retry once with timestamp if race condition on username
        if (error.meta?.target?.includes("username")) {
          try {
            const fallbackUsername = `${req.body.name.split(" ")[0].toLowerCase()}${Date.now().toString().slice(-4)}`;
            const userCode = await generateUniqueUserCode("guardian");
            const defaultPassword = `O${userCode}`;
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const result = await prisma.$transaction(async (tx) => {
              const guardian = await tx.guardian.create({ data: req.body });
              await tx.user.create({
                data: {
                  name: req.body.name,
                  email: req.body.email,
                  nipNis: req.body.email,
                  username: fallbackUsername,
                  userCode,
                  password: hashedPassword,
                  role: "guardian",
                  guardianId: guardian.id,
                },
              });
              return { guardian, username: fallbackUsername };
            });

            return res.status(201).json({ 
              success: true,
              message: `Wali murid berhasil ditambahkan. Login dengan Username: ${result.username}`, 
              data: { ...result.guardian, loginUsername: result.username }
            });
          } catch (retryError) {
            console.error("[Guardians] Retry failed:", retryError);
          }
        }
        res.status(400).json({ success: false, message: "Nomor telepon atau email sudah digunakan" });
        return;
      }
      console.error("[Guardians] POST error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server saat membuat data wali murid" });
    }
  }
);

// PUT /api/guardians/:id
router.put(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  validate(guardianSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const guardianId = Number(req.params.id);

      const result = await prisma.$transaction(async (tx) => {
        const updatedGuardian = await tx.guardian.update({
          where: { id: guardianId },
          data,
        });

        // Jika email atau nama diupdate, sinkronkan ke tabel User
        if (data.email || data.name) {
          const updateData: any = {};
          if (data.name) updateData.name = data.name;
          if (data.email) {
            updateData.email = data.email;
            updateData.nipNis = data.email;
          }

          // Update user yang terkait
          const user = await tx.user.findUnique({ where: { guardianId } });
          if (user) {
            await tx.user.update({
              where: { id: user.id },
              data: updateData,
            });
          }
        }

        return updatedGuardian;
      });

      res.json({ success: true, message: "Wali murid berhasil diperbarui", data: result });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Wali murid tidak ditemukan" });
        return;
      }
      if (error.code === "P2002") {
        res.status(400).json({ success: false, message: "Email atau nomor telepon sudah digunakan" });
        return;
      }
      console.error("[Guardians] PUT error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

// DELETE /api/guardians/:id
router.delete(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const guardianId = Number(req.params.id);

      await prisma.$transaction(async (tx) => {
        // Hapus user yang terkait terlebih dahulu
        await tx.user.deleteMany({
          where: { guardianId },
        });

        // Hapus guardian
        await tx.guardian.delete({
          where: { id: guardianId },
        });
      });

      res.json({ success: true, message: "Wali murid berhasil dihapus" });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Wali murid tidak ditemukan" });
        return;
      }
      console.error("[Guardians] DELETE error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

// GET /api/guardians/:id/students
router.get("/:id/students", verifyJWT, async (req: Request, res: Response) => {
  try {
    const guardian = await prisma.guardian.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            nis: true,
            status: true,
            class: { select: { name: true } }
          }
        }
      }
    });

    if (!guardian) {
      res.status(404).json({ success: false, message: "Wali murid tidak ditemukan." });
      return;
    }

    res.json({ success: true, data: guardian.students });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// POST /api/guardians/:id/assign-student
router.post("/:id/assign-student", verifyJWT, async (req: any, res: Response) => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    const { studentId } = req.body;
    if (!studentId) {
      res.status(400).json({ success: false, message: "studentId wajib diisi." });
      return;
    }

    // Cek apakah student sudah terhubung
    const existing = await prisma.guardian.findFirst({
      where: {
        id: Number(req.params.id),
        students: { some: { id: Number(studentId) } }
      }
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: "Siswa sudah terhubung ke wali murid ini."
      });
      return;
    }

    await prisma.guardian.update({
      where: { id: Number(req.params.id) },
      data: {
        students: { connect: { id: Number(studentId) } }
      }
    });

    res.json({ success: true, message: "Siswa berhasil dihubungkan ke wali murid." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

// DELETE /api/guardians/:id/remove-student/:studentId
router.delete("/:id/remove-student/:studentId", verifyJWT, async (req: any, res: Response) => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    await prisma.guardian.update({
      where: { id: Number(req.params.id) },
      data: {
        students: { disconnect: { id: Number(req.params.studentId) } }
      }
    });

    res.json({ success: true, message: "Relasi siswa berhasil dilepas." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
  }
});

export default router;
