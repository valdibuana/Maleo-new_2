"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const announcementSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    author: zod_1.z.string().min(1),
    target: zod_1.z.enum(["all", "teacher", "student", "guardian"]).optional(),
    priority: zod_1.z.enum(["normal", "important", "urgent"]).optional(),
    isPublished: zod_1.z.boolean().optional(),
});
router.get("/", auth_1.verifyJWT, async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};
        if (search)
            where.title = { contains: String(search), mode: "insensitive" };
        const announcements = await prisma_1.prisma.announcement.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        const result = announcements.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString().split("T")[0],
        }));
        res.json({ data: result, total: result.length });
    }
    catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
router.post("/", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(announcementSchema), async (req, res) => {
    try {
        const ann = await prisma_1.prisma.announcement.create({ data: req.body });
        res.status(201).json({ message: "Pengumuman berhasil dibuat", data: ann });
    }
    catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
router.get("/recent", auth_1.verifyJWT, async (req, res) => {
    try {
        const role = req.user?.role;
        // Determine allowed targets based on role
        let targets = ["all"];
        if (role === "student")
            targets.push("student");
        else if (role === "teacher")
            targets.push("teacher");
        else if (role === "guardian")
            targets.push("guardian");
        else if (["admin", "kepala_sekolah"].includes(role)) {
            // Admins and Principals see all targets
            targets = ["all", "student", "teacher", "guardian"];
        }
        const announcements = await prisma_1.prisma.announcement.findMany({
            where: {
                isPublished: true,
                target: { in: targets }
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        });
        res.json({ success: true, data: announcements });
    }
    catch (error) {
        console.error("[Announcements] GET /recent error:", error);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
router.put("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), (0, validate_1.validate)(announcementSchema.partial()), async (req, res) => {
    try {
        const ann = await prisma_1.prisma.announcement.update({ where: { id: Number(req.params.id) }, data: req.body });
        res.json({ message: "Pengumuman berhasil diperbarui", data: ann });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ message: "Pengumuman tidak ditemukan" });
            return;
        }
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
router.delete("/:id", auth_1.verifyJWT, (0, role_1.checkRole)("admin"), async (req, res) => {
    try {
        await prisma_1.prisma.announcement.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Pengumuman berhasil dihapus" });
    }
    catch (error) {
        if (error.code === "P2025") {
            res.status(404).json({ message: "Pengumuman tidak ditemukan" });
            return;
        }
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=announcements.route.js.map