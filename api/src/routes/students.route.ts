import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { generateUniqueUserCode } from "../lib/userCode";
import { parsePagination, buildPagination } from "../lib/pagination";
import { ROLES, isStaffRole } from "../lib/roles";
import { parseFields, selectFields } from "../lib/fields";
import multer from "multer";
import xlsx from "xlsx";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Simple in-memory cache for total counts to avoid expensive COUNT(*) queries
const totalCountCache = new Map<string, { count: number; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds
const cacheKey = (role: string, search: string | undefined, className: string | undefined) =>
  `students:total:${role}:${search ?? ""}:${className ?? ""}`;

const getCachedTotal = (key: string): number | null => {
  const entry = totalCountCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    totalCountCache.delete(key);
    return null;
  }
  return entry.count;
};

const setCachedTotal = (key: string, count: number) => {
  totalCountCache.set(key, { count, expiresAt: Date.now() + CACHE_TTL_MS });
};

const normalizeClassName = (value: string): string => {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
};

const parseBirthDate = (value: any): Date | null => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    return null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.replace(/[.-]/g, "/");
  const parts = normalized.split("/").map((p) => p.trim());
  if (parts.length === 3) {
    let day: number;
    let month: number;
    let year: number;

    // Support DD/MM/YYYY and YYYY/MM/DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    const parsedDate = new Date(year, month - 1, day);
    if (
      !isNaN(parsedDate.getTime()) &&
      parsedDate.getDate() === day &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getFullYear() === year
    ) {
      return parsedDate;
    }
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const studentSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  gender: z.enum(["L", "P"]),
  birthDate: z.string().min(1, "Tanggal lahir wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi").optional().or(z.literal("")),
  phone: z.string().min(1, "Telepon wajib diisi").optional().or(z.literal("")),
  classId: z.coerce.number().int().positive("Kelas harus dipilih"),
  status: z.enum(["active", "inactive"]).optional(),
});

// POST /api/students/import
router.post(
  "/import",
  verifyJWT,
  checkRole("admin"),
  upload.single("file"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "File tidak ditemukan" });
      }

      const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[];

      let successCount = 0;
      let errorCount = 0;
      let warningCount = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      const allClasses = await prisma.class.findMany();
      const classMap = new Map<string, number>();
      allClasses.forEach((c) => {
        classMap.set(normalizeClassName(c.name), c.id);
      });

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        if (row.every((cell: any) => !cell || String(cell).trim() === "")) continue;

        const name = row[0] ? String(row[0]).trim() : "";
        const nis = row[1] ? String(row[1]).trim().replace(/^'/, "") : "";
        const genderRaw = row[2] ? String(row[2]).trim().toUpperCase() : "";
        const birthDateRaw = row[3];
        const classNameRaw = row[4] ? String(row[4]).trim() : "";
        const phone = row[5] ? String(row[5]).trim() : "";
        const address = row[6] ? String(row[6]).trim() : "";

        if (!name || !nis || !classNameRaw) {
          errors.push(`Baris ${i + 1}: Data wajib (Nama, NIS, Kelas) belum lengkap`);
          errorCount++;
          continue;
        }

        const gender = genderRaw === "L" || genderRaw === "P" ? genderRaw : "L";

        const hasBirthDate = birthDateRaw !== null && birthDateRaw !== undefined && String(birthDateRaw).trim() !== "";
        const birthDate = hasBirthDate ? parseBirthDate(birthDateRaw) : null;

        if (hasBirthDate && !birthDate) {
          warnings.push(`Baris ${i + 1}: Format tanggal lahir tidak valid (${birthDateRaw}). Gunakan format DD/MM/YYYY (contoh: 25/06/2010), tanggal lahir dikosongkan`);
          warningCount++;
        }

        const classId = classMap.get(normalizeClassName(classNameRaw));
        if (!classId) {
          errors.push(`Baris ${i + 1}: Kelas '${classNameRaw}' tidak ditemukan di sistem`);
          errorCount++;
          continue;
        }

        const existingStudent = await prisma.student.findUnique({ where: { nis } });

        try {
          await prisma.$transaction(async (tx) => {
            if (existingStudent) {
              const updateData: any = {
                name,
                gender: gender as any,
                address,
                phone,
                classId
              };
              if (birthDate) {
                updateData.birthDate = birthDate;
              }

              await tx.student.update({
                where: { nis },
                data: updateData
              });
              await tx.user.updateMany({
                where: { studentId: existingStudent.id },
                data: { name }
              });
            } else {
              let userCode = "";
              let isUnique = false;
              while (!isUnique) {
                const code = Math.floor(1000 + Math.random() * 9000);
                userCode = `S${code}`;
                const exists = await tx.user.findFirst({ where: { userCode } });
                if (!exists) {
                  isUnique = true;
                }
              }

              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(userCode, salt);

              const student = await tx.student.create({
                data: {
                  nis,
                  name,
                  gender: gender as any,
                  birthDate,
                  address,
                  phone,
                  classId,
                  status: "active"
                }
              });

              await tx.user.create({
                data: {
                  name,
                  nipNis: nis,
                  userCode,
                  password: hashedPassword,
                  role: "student",
                  studentId: student.id
                }
              });
            }
          });
          successCount++;
        } catch (e: any) {
          errors.push(`Baris ${i + 1}: Gagal menyimpan - ${e.message}`);
          errorCount++;
        }
      }

      if (successCount === 0 && errorCount > 0) {
        return res.status(400).json({ success: false, message: "Gagal import seluruh data", errors });
      }

      let msg = `Berhasil meng-import ${successCount} siswa.`;
      if (errorCount > 0) {
        msg += ` Terdapat error di ${errorCount} data (silakan cek log/info).`;
      }
      if (warningCount > 0) {
        msg += ` Ada ${warningCount} data dengan tanggal lahir tidak valid (disimpan tanpa tanggal lahir).`;
      }

      return res.status(200).json({ success: true, message: msg, errors, warnings });
    } catch (error: any) {
      console.error("[Students Import] error:", error);
      return res.status(500).json({ success: false, message: "Terjadi kesalahan server saat membaca file Excel" });
    }
  }
);

// GET /api/students/export
router.get("/export", verifyJWT, checkRole("admin"), async (req: Request, res: Response): Promise<any> => {
  try {
    const students = await prisma.student.findMany({
      include: {
        class: true
      },
      orderBy: {
        name: "asc"
      }
    });

    const headers = ["Nama Lengkap", "Nis", "Jenis Kelamin", "Tanggal lahir (DD/MM/YYYY)", "Kelas", "Telepon", "Alamat"];
    
    const rows = students.map((s) => {
      let birthDateStr = "-";
      if (s.birthDate) {
        const day = String(s.birthDate.getDate()).padStart(2, "0");
        const month = String(s.birthDate.getMonth() + 1).padStart(2, "0");
        const year = s.birthDate.getFullYear();
        birthDateStr = `${day}/${month}/${year}`;
      }

      return [
        s.name,
        s.nis,
        s.gender,
        birthDateStr,
        s.class?.name || "",
        s.phone || "",
        s.address || ""
      ];
    });

    const data = [headers, ...rows];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(data);

    // Auto-size columns slightly
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    colWidths[0] = { wch: 25 }; // Nama Lengkap
    colWidths[6] = { wch: 30 }; // Alamat
    ws["!cols"] = colWidths;

    xlsx.utils.book_append_sheet(wb, ws, "Siswa");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Export_Siswa_${Date.now()}.xlsx`);
    
    return res.end(buffer);
  } catch (error: any) {
    console.error("[Students Export] error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server saat export Excel" });
  }
});

// GET /api/students
router.get("/", verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId, role } = req.user!;
    const { search, className } = req.query;
    const where: any = { deletedAt: null };

    // ── Role-based data filtering ──
    if (role === ROLES.STUDENT) {
      // Students can only see themselves
      const student = await prisma.student.findFirst({ where: { user: { id: userId }, deletedAt: null } });
      if (!student) return res.json({ success: true, data: [], total: 0 });
      where.id = student.id;
    } else if (role === ROLES.GUARDIAN) {
      // Guardians can only see their own children
      const guardian = await prisma.guardian.findFirst({
        where: { user: { id: userId } },
        include: { students: { select: { id: true } } },
      });
      const childIds = guardian?.students.map((s) => s.id) || [];
      if (childIds.length === 0) return res.json({ success: true, data: [], total: 0 });
      where.id = { in: childIds };
    }
    // admin, kepala_sekolah, teacher: can see all students

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { nis: { contains: String(search) } },
      ];
    }
    if (className) {
      where.class = { name: String(className) };
    }

    // Determine which fields to expose based on role
    const isAdminOrStaff = isStaffRole(role) || role === ROLES.TEACHER;

    const { page, limit, skip } = parsePagination(req.query as Record<string, any>);
    const fields = parseFields(req.query as Record<string, any>);

    // Cursor-based pagination: use last item id as cursor instead of OFFSET
    const rawCursor = req.query.cursor as string | undefined;
    const cursor = rawCursor ? Number(rawCursor) : undefined;
    const isFirstPage = !rawCursor || Number.isNaN(cursor);

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        guardians: isAdminOrStaff ? { select: { id: true, name: true } } : false,
        user: isAdminOrStaff ? { select: { userCode: true } } : false,
      },
      orderBy: { id: "asc" }, // stable cursor requires deterministic order
      skip: isFirstPage ? undefined : 1, // skip the cursor itself
      take: limit,
      ...(cursor ? { cursor: { id: cursor } } : {}),
    });

    // Total count: only compute on first page, then cache
    const key = cacheKey(role, search as string | undefined, className as string | undefined);
    let total: number;
    if (isFirstPage) {
      total = await prisma.student.count({ where });
      setCachedTotal(key, total);
    } else {
      total = getCachedTotal(key) ?? 0;
    }

    const result = students.map((s) => ({
      id: s.id,
      nis: s.nis,
      name: s.name,
      gender: s.gender,
      birthDate: isAdminOrStaff && s.birthDate ? s.birthDate.toISOString().split("T")[0] : null,
      address: isAdminOrStaff ? s.address : undefined,
      phone: isAdminOrStaff ? s.phone : undefined,
      classId: s.classId,
      className: s.class.name,
      status: s.status,
      userCode: isAdminOrStaff ? ((s as any).user?.userCode || null) : undefined,
      guardians: isAdminOrStaff ? s.guardians.map((g: any) => ({ id: g.id, name: g.name })) : undefined,
    }));

    const filteredResult = selectFields(result, fields);
    res.json({ success: true, data: filteredResult, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    console.error("[Students] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// GET /api/students/:id
router.get("/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        class: { select: { id: true, name: true } },
        guardians: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!student) {
      res.status(404).json({ success: false, message: "Siswa tidak ditemukan" });
      return;
    }
    res.json({ success: true, data: student });
  } catch (error) {
    console.error("[Students] GET by ID error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// POST /api/students
router.post(
  "/",
  verifyJWT,
  checkRole("admin"),
  validate(studentSchema),
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const { nis, name } = data;

      // 1. Generate unique code dengan prefix (e.g. S9546)
      let userCode = "";
      let isUnique = false;
      while (!isUnique) {
        const rawCode = await generateUniqueUserCode("student");
        userCode = `S${rawCode}`;
        const exists = await prisma.user.findFirst({ where: { userCode } });
        if (!exists) isUnique = true;
      }
      const defaultPassword = userCode;
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      // 3. Transaction: buat Student dulu, dapat id-nya, baru buat User dengan studentId FK
      const result = await prisma.$transaction(async (tx) => {
        // Buat Profil Student terlebih dahulu
        const student = await tx.student.create({
          data: {
            ...data,
            birthDate: new Date(data.birthDate),
          },
        });

        // Buat Akun User dengan FK studentId
        await tx.user.create({
          data: {
            name,
            nipNis: nis,
            userCode,
            password: hashedPassword,
            role: "student",
            studentId: student.id,
          },
        });

        return { student };
      });

      const hintStudent = result.student.phone
        ? `HP: ${result.student.phone}`
        : `NIS: ${result.student.nis}`;

      res.status(201).json({ 
        success: true, 
        message: `Siswa ${result.student.name} berhasil ditambahkan. ${hintStudent}. Akun login otomatis dibuat dengan Password: ${defaultPassword}`, 
        data: {
          ...result.student,
          disambiguationHint: hintStudent
        }
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(400).json({ success: false, message: "NIS sudah digunakan di sistem" });
        return;
      }
      console.error("[Students] POST error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server saat membuat data siswa" });
    }
  }
);

// PUT /api/students/:id
router.put(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  validate(studentSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (data.birthDate) data.birthDate = new Date(data.birthDate);

      const student = await prisma.student.update({
        where: { id: Number(req.params.id) },
        data,
      });
      res.json({ success: true, message: "Siswa berhasil diperbarui", data: student });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Siswa tidak ditemukan" });
        return;
      }
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

// DELETE /api/students/:id (soft delete)
router.delete(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.id);

      // Soft delete: set deletedAt timestamp and deactivate user
      await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({ where: { id: studentId } });
        if (!student || student.deletedAt) {
          throw { code: "P2025" };
        }

        // Mark student as deleted
        await tx.student.update({
          where: { id: studentId },
          data: { deletedAt: new Date(), status: "inactive" },
        });

        // Deactivate the linked user account (don't delete it)
        await tx.user.updateMany({
          where: { studentId },
          data: { force_change_password: true }, // effectively lock out
        });
      });

      res.json({ success: true, message: "Siswa berhasil dihapus (soft delete)" });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Siswa tidak ditemukan" });
        return;
      }
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

export default router;
