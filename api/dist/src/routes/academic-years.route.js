"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const yearSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nama wajib diisi"),
    semester: zod_1.z.enum(["Ganjil", "Genap"]),
    startDate: zod_1.z.string().min(1, "Tanggal mulai wajib diisi"),
    endDate: zod_1.z.string().min(1, "Tanggal selesai wajib diisi"),
    isActive: zod_1.z.boolean().optional(),
});
// GET /api/academic-years
router.get("/", auth_1.verifyJWT, async (_req, res) => {
    try {
        const years = await prisma_1.prisma.academicYear.findMany({ orderBy: [{ isActive: "desc" }, { startDate: "desc" }] });
        const result = years.map((y) => ({
            ...y,
            startDate: y.startDate.toISOString().split("T")[0],
            endDate: y.endDate.toISOString().split("T")[0],
        }));
        res.json({ data: result, total: result.length });
    }
    catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
// POST /api/academic-years
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(yearSchema), async (req, res) => {
    try {
        const data = req.body;
        // Use transaction for atomic operation
        const year = await prisma_1.prisma.$transaction(async (tx) => {
            if (data.isActive) {
                await tx.academicYear.updateMany({ data: { isActive: false } });
            }
            return await tx.academicYear.create({
                data: { ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
            });
        });
        res.status(201).json({ success: true, message: "Tahun ajaran berhasil ditambahkan", data: year });
    }
    catch (error) {
        console.error("[AcademicYears] POST error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// PUT /api/academic-years/:id
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(yearSchema.partial()), async (req, res) => {
    try {
        const data = req.body;
        const id = Number(req.params.id);
        // If setting this one as active, deactivate all others first
        if (data.isActive === true) {
            await prisma_1.prisma.academicYear.updateMany({
                where: { id: { not: id } },
                data: { isActive: false }
            });
        }
        if (data.startDate)
            data.startDate = new Date(data.startDate);
        if (data.endDate)
            data.endDate = new Date(data.endDate);
        const year = await prisma_1.prisma.academicYear.update({ where: { id }, data });
        res.json({ success: true, message: "Tahun ajaran berhasil diperbarui", data: year });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ success: false, message: "Tahun ajaran tidak ditemukan" });
            return;
        }
        console.error("[AcademicYears] PUT error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
// DELETE /api/academic-years/:id
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        await prisma_1.prisma.academicYear.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Tahun ajaran berhasil dihapus" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ message: "Tahun ajaran tidak ditemukan" });
            return;
        }
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=academic-years.route.js.map