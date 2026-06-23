import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";

const router = Router();

const scheduleSchema = z.object({
  day: z.string().min(1, "Hari wajib diisi"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid (HH:MM)"),
  room: z.string().min(1, "Ruangan wajib diisi"),
  subjectId: z.coerce.number().int().positive("Mata Pelajaran harus dipilih"),
  teacherId: z.coerce.number().int().positive("Guru harus dipilih"),
  classId: z.coerce.number().int().positive("Kelas harus dipilih"),
});

router.get("/", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { className } = req.query;
    const where: any = {};
    if (className) where.class = { name: String(className) };

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        teacher: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });
    const result = schedules.map((s) => ({
      id: s.id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      subjectName: s.subject.name,
      teacherName: s.teacher.name,
      className: s.class.name,
    }));
    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error("[Schedules] GET error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});

router.post(
  "/",
  verifyJWT,
  checkRole("admin"),
  validate(scheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const schedule = await prisma.schedule.create({ data: req.body });
      res.status(201).json({ success: true, message: "Jadwal berhasil ditambahkan", data: schedule });
    } catch (error) {
      console.error("[Schedules] POST error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

router.put(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  validate(scheduleSchema.partial()),
  async (req: Request, res: Response) => {
    try {
      const schedule = await prisma.schedule.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json({ success: true, message: "Jadwal berhasil diperbarui", data: schedule });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
        return;
      }
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

router.delete(
  "/:id",
  verifyJWT,
  checkRole("admin"),
  async (req: Request, res: Response) => {
    try {
      await prisma.schedule.delete({ where: { id: Number(req.params.id) } });
      res.json({ success: true, message: "Jadwal berhasil dihapus" });
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
        return;
      }
      res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
  }
);

export default router;
