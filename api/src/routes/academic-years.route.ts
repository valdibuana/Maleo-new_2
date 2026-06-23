import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";

const router = Router();

const yearSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  semester: z.enum(["Ganjil", "Genap"]),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
  isActive: z.boolean().optional(),
});

// GET /api/academic-years
router.get("/", verifyJWT, async (_req: Request, res: Response) => {
  try {
    const years = await prisma.academicYear.findMany({ orderBy: [{ isActive: "desc" }, { startDate: "desc" }] });
    const result = years.map((y) => ({
      ...y,
      startDate: y.startDate.toISOString().split("T")[0],
      endDate: y.endDate.toISOString().split("T")[0],
    }));
    res.json({ data: result, total: result.length });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

// POST /api/academic-years
router.post("/", verifyJWT, checkRole("admin"), validate(yearSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Use transaction for atomic operation
    const year = await prisma.$transaction(async (tx) => {
      if (data.isActive) {
        await tx.academicYear.updateMany({ data: { isActive: false } });
      }
      return await tx.academicYear.create({
        data: { ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
      });
    });

    res.status(201).json({ success: true, message: "Tahun ajaran berhasil ditambahkan", data: year });
  } catch (error) {
    console.error("[AcademicYears] POST error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// PUT /api/academic-years/:id
router.put("/:id", verifyJWT, checkRole("admin"), validate(yearSchema.partial()), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = Number(req.params.id);

    // If setting this one as active, deactivate all others first
    if (data.isActive === true) {
      await prisma.academicYear.updateMany({
        where: { id: { not: id } },
        data: { isActive: false }
      });
    }

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const year = await prisma.academicYear.update({ where: { id }, data });
    res.json({ success: true, message: "Tahun ajaran berhasil diperbarui", data: year });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ success: false, message: "Tahun ajaran tidak ditemukan" }); return; }
    console.error("[AcademicYears] PUT error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// DELETE /api/academic-years/:id
router.delete("/:id", verifyJWT, checkRole("admin"), async (req: Request, res: Response) => {
  try {
    await prisma.academicYear.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Tahun ajaran berhasil dihapus" });
  } catch (error: any) {
    if (error.code === "P2025") { res.status(404).json({ message: "Tahun ajaran tidak ditemukan" }); return; }
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

export default router;
