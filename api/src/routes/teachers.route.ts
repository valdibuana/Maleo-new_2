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

const teacherSchema = z.object({
  nip: z.string().min(1, "NIP wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  gender: z.enum(["L", "P"]),
  email: z.string().email("Email tidak valid"),
  phone: z.string().min(1, "Telepon wajib diisi"),
  subject: z.string().optional().or(z.literal("")),
  subjectIds: z.array(z.number()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/teachers
router.get("/", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { nip: { contains: String(search) } },
        { subject: { contains: String(search), mode: "insensitive" } },
      ];
    }
    const teachers = await prisma.teacher.findMany({
      where,
      select: {
        id: true,
        nip: true,
        name: true,
        gender: true,
        email: true,
        phone: true,
        subject: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { userCode: true } },
        subjects: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    const result = teachers.map((t) => ({
      ...t,
      userCode: t.user?.userCode || null,
    }));

    res.json({ data: result, total: teachers.length });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// GET /api/teachers/:id
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({ 
      where: { id: Number(req.params.id) },
      include: { subjects: { select: { id: true, name: true } } }
    });
    if (!teacher) { res.status(404).json({ message: "Guru tidak ditemukan" }); return; }
    res.json({ data: teacher });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// POST /api/teachers
router.post("/", verifyJWT, checkRole("admin"), validate(teacherSchema), async (req: Request, res: Response) => {
  try {
    const { nip, name, email, subject, subjectIds, ...restData } = req.body;
    const data = { nip, name, email, subject, ...restData };

    // 1. Generate unique username dari nama
    const username = await generateUniqueUsername(name);

    // 2. Generate unique code dengan prefix (e.g. G001)
    let userCode = "";
    let isUnique = false;
    while (!isUnique) {
      const rawCode = await generateUniqueUserCode("teacher");
      userCode = `G${rawCode}`;
      const exists = await prisma.user.findFirst({ where: { userCode } });
      if (!exists) isUnique = true;
    }

    // 3. Generate default password (same as userCode)
    const defaultPassword = userCode;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // 4. Transaction: buat Teacher dulu, dapat id-nya, baru buat User dengan teacherId FK
    const result = await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.create({ 
        data: {
          ...data,
          subjects: subjectIds ? { connect: subjectIds.map((id: number) => ({ id })) } : undefined
        }
      });

      await tx.user.create({
        data: {
          name,
          email,
          nipNis: nip,
          username, // USERNAME untuk login (bukan NIP)
          userCode,
          password: hashedPassword,
          role: "teacher",
          teacherId: teacher.id,
        },
      });

      return { teacher, username, userCode, subject };
    });

    const hintTeacher = result.teacher.phone
      ? `HP: ${result.teacher.phone}`
      : `NIP: ${result.teacher.nip}`;

    res.status(201).json({ 
      success: true,
      message: `Guru ${result.teacher.name} berhasil ditambahkan. ${hintTeacher}. Akun login otomatis dibuat dengan Password: ${defaultPassword}`, 
      data: {
        ...result.teacher,
        loginUsername: result.username,
        disambiguationHint: hintTeacher
      }
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Retry once with timestamp if race condition
      if (error.meta?.target?.includes("username")) {
        try {
          const fallbackUsername = `${req.body.name.split(" ")[0].toLowerCase()}${Date.now().toString().slice(-4)}`;
          const rawCode = await generateUniqueUserCode("teacher");
          const userCode = `G${rawCode}`;
          const defaultPassword = userCode;
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          const result = await prisma.$transaction(async (tx) => {
            const teacher = await tx.teacher.create({ data: req.body });
            await tx.user.create({
              data: {
                name: req.body.name,
                email: req.body.email,
                nipNis: req.body.nip,
                username: fallbackUsername,
                userCode,
                password: hashedPassword,
                role: "teacher",
                teacherId: teacher.id,
              },
            });
            return { teacher, username: fallbackUsername };
          });

          return res.status(201).json({ 
            success: true,
            message: `Guru berhasil ditambahkan. Akun login otomatis dibuat dengan Password: ${defaultPassword}`, 
            data: { ...result.teacher, loginUsername: result.username }
          });
        } catch (retryError) {
          console.error("[Teachers] Retry failed:", retryError);
        }
      }
      res.status(400).json({ success: false, message: "NIP atau email sudah digunakan" }); 
      return; 
    }
    console.error("[Teachers] POST error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server saat membuat data guru" });
  }
});

// PUT /api/teachers/:id
router.put("/:id", verifyJWT, checkRole("admin"), validate(teacherSchema.partial()), async (req: Request, res: Response) => {
  try {
    const teacherId = Number(req.params.id);
    const { subjectIds, ...data } = req.body;
    const updateData: any = { ...data };
    
    if (subjectIds) {
      // Pre-flight check: Cannot unassign a subject directly from here
      // because Subject.teacherId is required in the database.
      const currentSubjects = await prisma.subject.findMany({ where: { teacherId } });
      const removedSubjects = currentSubjects.filter(s => !subjectIds.includes(s.id));
      
      if (removedSubjects.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Tidak dapat menghapus mata pelajaran (${removedSubjects.map(s => s.name).join(', ')}). Karena setiap mata pelajaran wajib memiliki guru, silakan alihkan mata pelajaran ini ke guru lain melalui menu 'Mata Pelajaran' terlebih dahulu.`
        });
      }

      updateData.subjects = { set: subjectIds.map((id: number) => ({ id })) };
    }
    
    const teacher = await prisma.teacher.update({ 
      where: { id: teacherId }, 
      data: updateData 
    });
    res.json({ message: "Guru berhasil diperbarui", data: teacher });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ message: "Guru tidak ditemukan" }); return; }
    console.error("[Teachers] PUT error:", error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// DELETE /api/teachers/:id (soft delete)
router.delete("/:id", verifyJWT, checkRole("admin"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // 1. Pengecekan Relasi (Safe Delete)
    const [hasSubjects, hasSchedules, hasHomeroom] = await Promise.all([
      prisma.subject.findFirst({ where: { teacherId: id } }),
      prisma.schedule.findFirst({ where: { teacherId: id } }),
      prisma.class.findFirst({ where: { homeroomTeacherId: id } }),
    ]);

    if (hasSubjects || hasSchedules || hasHomeroom) {
      return res.status(400).json({ 
        success: false,
        message: "Tidak dapat menghapus data: Guru yang bersangkutan masih memiliki beban mengajar atau terdaftar sebagai Wali Kelas. Silakan kosongkan atau pindahkan data terlebih dahulu." 
      });
    }

    // 2. Soft delete: set deletedAt timestamp
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher || teacher.deletedAt) {
      return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
    }

    await prisma.$transaction(async (tx) => {
      // Mark teacher as deleted
      await tx.teacher.update({
        where: { id },
        data: { deletedAt: new Date(), status: "inactive" },
      });

      // Nonaktifkan user yang terkait tapi jangan hapus
      await tx.user.updateMany({
        where: { teacherId: id },
        data: { password: "DEACTIVATED_" + Date.now() },
      });
    });
    
    res.json({ success: true, message: "Guru dipindahkan ke Recycle Bin" });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ success: false, message: "Guru tidak ditemukan" }); return; }
    console.error("[Teachers] DELETE error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

export default router;
