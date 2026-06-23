"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ──────────────────────────────────────────────
// IDENTITY GUARD (inline, ikuti pola existing)
// ──────────────────────────────────────────────
const identityGuard = async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user?.id },
            select: { nipNis: true, role: true },
        });
        if (!user || !user.nipNis) {
            return res.status(404).json({ success: false, message: "Profil user tidak lengkap." });
        }
        if (user.role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findUnique({ where: { nip: user.nipNis } });
            if (teacher)
                req.teacherId = teacher.id;
        }
        else if (user.role === "student") {
            const student = await prisma_1.prisma.student.findUnique({ where: { nis: user.nipNis } });
            if (student) {
                req.studentId = student.id;
                req.classId = student.classId;
            }
        }
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan identitas." });
    }
};
router.use(auth_1.verifyJWT);
router.use(identityGuard);
// ──────────────────────────────────────────────
// TEACHER GUARD
// ──────────────────────────────────────────────
const teacherGuard = (req, res, next) => {
    if (req.user.role !== "teacher") {
        return res.status(403).json({
            success: false,
            message: "Akses ditolak. Hanya guru yang dapat mengakses endpoint ini.",
        });
    }
    next();
};
// ──────────────────────────────────────────────
// OWNERSHIP GUARD (RPS milik guru yang login)
// ──────────────────────────────────────────────
const rpsOwnershipGuard = async (req, res, next) => {
    try {
        const rpsId = Number(req.params.rpsId || req.params.id);
        if (!rpsId)
            return next(); // lewati jika tidak ada rpsId di param
        const rps = await prisma_1.prisma.rPS.findUnique({ where: { id: rpsId } });
        if (!rps) {
            return res.status(404).json({ success: false, message: "RPS tidak ditemukan." });
        }
        if (rps.teacherId !== req.teacherId) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke RPS ini.",
            });
        }
        req.rps = rps;
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
};
// ──────────────────────────────────────────────
// MULTER — Upload materi RPS (folder terpisah)
// ──────────────────────────────────────────────
const uploadDir = path_1.default.join(process.cwd(), "uploads", "rps-materials");
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const ALLOWED_MIMES = [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/zip",
    "application/x-zip-compressed",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel" // .xls
];
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Tipe file tidak didukung: ${file.mimetype}`));
        }
    },
});
// ──────────────────────────────────────────────
// HELPER: Generate Nomor Induk Unik
// ──────────────────────────────────────────────
async function generateNomorInduk(subjectCode, year) {
    const count = await prisma_1.prisma.rPS.count();
    const seq = String(count + 1).padStart(3, "0");
    return {
        nomorInduk1: `RPS/SMP/${year}/${seq}`,
        nomorInduk2: `MOD/${subjectCode.toUpperCase()}/${year}/${seq}`,
        nomorInduk3: `ATP/${year}/${seq}`,
    };
}
// ──────────────────────────────────────────────
// HELPER: Mime ke tipe MaterialTypeRPS
// ──────────────────────────────────────────────
const mimeToType = new Map([
    ["application/pdf", "pdf"],
    ["application/vnd.ms-powerpoint", "ppt"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
    ["application/msword", "docx"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["video/mp4", "video_link"],
    ["image/jpeg", "image"],
    ["image/jpg", "image"],
    ["image/png", "image"],
    ["application/zip", "zip"],
    ["application/x-zip-compressed", "zip"],
]);
// ══════════════════════════════════════════════
// TEACHER — MATA PELAJARAN
// ══════════════════════════════════════════════
// GET /api/rps/my-subjects — mapel yang diampu guru (dari TeacherSubject)
router.get("/my-subjects", teacherGuard, async (req, res) => {
    try {
        const teacherSubjects = await prisma_1.prisma.teacherSubject.findMany({
            where: { teacherId: req.teacherId },
            include: {
                subject: { select: { id: true, name: true, code: true, gradeLevel: true } },
            },
        });
        res.json({ success: true, data: teacherSubjects.map((ts) => ts.subject) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// POST /api/rps/my-subjects — tambah mapel (max 2)
router.post("/my-subjects", teacherGuard, async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const existingCount = await prisma_1.prisma.teacherSubject.count({ where: { teacherId } });
        if (existingCount >= 2) {
            return res.status(400).json({
                success: false,
                message: "Anda sudah mengampu 2 mata pelajaran (maksimum). Hapus salah satu untuk menambah.",
            });
        }
        const { subjectId } = req.body;
        if (!subjectId) {
            return res.status(400).json({ success: false, message: "subjectId wajib diisi." });
        }
        const existing = await prisma_1.prisma.teacherSubject.findUnique({
            where: { teacherId_subjectId: { teacherId, subjectId: Number(subjectId) } },
        });
        if (existing) {
            return res.status(400).json({ success: false, message: "Mata pelajaran ini sudah Anda ampu." });
        }
        const ts = await prisma_1.prisma.teacherSubject.create({
            data: {
                teacherId,
                subjectId: Number(subjectId),
                isPrimary: existingCount === 0,
            },
            include: { subject: true },
        });
        res.status(201).json({ success: true, data: ts });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// DELETE /api/rps/my-subjects/:subjectId — lepas mapel
router.delete("/my-subjects/:subjectId", teacherGuard, async (req, res) => {
    try {
        const teacherId = req.teacherId;
        await prisma_1.prisma.teacherSubject.delete({
            where: {
                teacherId_subjectId: { teacherId, subjectId: Number(req.params.subjectId) },
            },
        });
        res.json({ success: true, message: "Mata pelajaran berhasil dilepas." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ══════════════════════════════════════════════
// TEACHER — STUDENT VIEW (harus SEBELUM /:id)
// ══════════════════════════════════════════════
// GET /api/rps/student/my-rps — siswa lihat RPS published di kelasnya
router.get("/student/my-rps", async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Hanya siswa yang dapat mengakses endpoint ini.'
            });
        }
        // Ambil data student dari user yang login
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                student: {
                    select: { id: true, classId: true, name: true }
                }
            }
        });
        if (!user?.student) {
            return res.status(404).json({
                success: false,
                message: 'Data siswa tidak ditemukan. Hubungi admin.'
            });
        }
        const studentClassId = user.student.classId;
        // Fetch RPS yang published sesuai kelas siswa
        const rpsList = await prisma_1.prisma.rPS.findMany({
            where: {
                classId: studentClassId,
                status: 'published', // HANYA published
            },
            include: {
                subject: {
                    select: { id: true, name: true, code: true }
                },
                class: {
                    select: { id: true, name: true }
                },
                teacher: {
                    select: { name: true }
                },
                academicYear: {
                    select: { id: true, name: true, semester: true, isActive: true }
                },
                meetings: {
                    where: {
                        status: 'published', // HANYA meeting yang published
                    },
                    include: {
                        materials: {
                            orderBy: { order: 'asc' },
                            // Semua material di meeting published = visible
                        },
                        _count: {
                            select: { materials: true }
                        }
                    },
                    orderBy: { meetingNumber: 'asc' }
                },
                _count: {
                    select: {
                        meetings: {
                            where: { status: 'published' }
                        }
                    }
                }
            },
            orderBy: { publishedAt: 'desc' }
        });
        res.json({
            success: true,
            data: rpsList,
            student: {
                id: user.student.id,
                name: user.student.name,
                classId: studentClassId,
            }
        });
    }
    catch (error) {
        console.error('[RPS Student] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server.'
        });
    }
});
// POST /api/rps/student/materials/:materialId/access — track akses materi siswa
router.post("/student/materials/:materialId/access", async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ success: false, message: "Akses ditolak." });
        }
        const studentId = req.studentId;
        const materialId = Number(req.params.materialId);
        await prisma_1.prisma.rPSMaterialAccess.upsert({
            where: { studentId_materialId: { studentId, materialId } },
            create: { studentId, materialId },
            update: { accessedAt: new Date() },
        });
        res.json({ success: true, message: "Akses direkodkan." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// GET /api/rps/template/excel — download template Excel (SEBELUM /:id)
router.get("/template/excel", teacherGuard, async (_req, res) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const XLSX = require("xlsx");
        const templateData = [
            {
                "No Pertemuan": 1,
                "Judul Pertemuan": "Contoh: Pengenalan Aljabar",
                "Alur Pembelajaran": "Contoh: Eksplorasi konsep → Diskusi → Latihan",
                "Tujuan Pembelajaran": "Contoh: Siswa memahami konsep dasar aljabar",
                Aktivitas: "Contoh: Ceramah, Diskusi Kelompok, Kuis",
                Penilaian: "Contoh: Kuis 20%, Tugas 30%, UTS 50%",
            },
            ...Array.from({ length: 15 }, (_, i) => ({
                "No Pertemuan": i + 2,
                "Judul Pertemuan": "",
                "Alur Pembelajaran": "",
                "Tujuan Pembelajaran": "",
                Aktivitas: "",
                Penilaian: "",
            })),
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);
        ws["!cols"] = [
            { wch: 15 }, { wch: 30 }, { wch: 40 },
            { wch: 40 }, { wch: 30 }, { wch: 30 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Template RPS");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=Template_RPS_Maleo.xlsx");
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Gagal generate template." });
    }
});
// ══════════════════════════════════════════════
// TEACHER — RPS CRUD
// ══════════════════════════════════════════════
// GET /api/rps — list semua RPS milik guru
router.get("/", teacherGuard, async (req, res) => {
    try {
        const rpsList = await prisma_1.prisma.rPS.findMany({
            where: { teacherId: req.teacherId },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                class: { select: { id: true, name: true, level: true } },
                academicYear: { select: { id: true, name: true, semester: true } },
                _count: { select: { meetings: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ success: true, data: rpsList });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// POST /api/rps/generate — generate RPS + semua meeting sekaligus
router.post("/generate", teacherGuard, async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { subjectId, classId, academicYearId, totalMeetings = 16, learningObjective, learningStrategy, teacherNote, } = req.body;
        if (!subjectId || !classId || !academicYearId) {
            return res.status(400).json({
                success: false,
                message: "subjectId, classId, dan academicYearId wajib diisi.",
            });
        }
        // Validasi max 16 pertemuan
        if (Number(totalMeetings) > 16) {
            return res.status(400).json({
                success: false,
                message: "Jumlah pertemuan tidak boleh lebih dari 16 per semester.",
            });
        }
        const meetings = Math.min(Math.max(Number(totalMeetings), 1), 16);
        // Cek duplikat RPS
        const existing = await prisma_1.prisma.rPS.findFirst({
            where: {
                subjectId: Number(subjectId),
                classId: Number(classId),
                teacherId,
                academicYearId: Number(academicYearId),
            },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "RPS untuk kombinasi mapel, kelas, dan tahun ajaran ini sudah ada.",
                data: existing,
            });
        }
        // Ambil data subject & academicYear untuk nomor induk
        const [subject, academicYear] = await Promise.all([
            prisma_1.prisma.subject.findUnique({ where: { id: Number(subjectId) } }),
            prisma_1.prisma.academicYear.findUnique({ where: { id: Number(academicYearId) } }),
        ]);
        if (!subject || !academicYear) {
            return res.status(404).json({ success: false, message: "Mata pelajaran atau tahun ajaran tidak ditemukan." });
        }
        const year = new Date(academicYear.startDate).getFullYear();
        const nomor = await generateNomorInduk(subject.code, year);
        // Buat RPS + meetings dalam 1 transaksi
        const rps = await prisma_1.prisma.$transaction(async (tx) => {
            const newRPS = await tx.rPS.create({
                data: {
                    ...nomor,
                    subjectId: Number(subjectId),
                    classId: Number(classId),
                    teacherId,
                    academicYearId: Number(academicYearId),
                    totalMeetings: meetings,
                    learningObjective: learningObjective || null,
                    learningStrategy: learningStrategy || null,
                    teacherNote: teacherNote || null,
                    status: "draft",
                },
            });
            // Auto-generate semua meeting
            const meetingData = Array.from({ length: meetings }, (_, i) => ({
                rpsId: newRPS.id,
                meetingNumber: i + 1,
                title: `Pertemuan ${i + 1}`,
                status: "draft",
            }));
            await tx.rPSMeeting.createMany({ data: meetingData });
            return newRPS;
        });
        // Fetch RPS lengkap untuk response
        const rpsWithMeetings = await prisma_1.prisma.rPS.findUnique({
            where: { id: rps.id },
            include: {
                meetings: { orderBy: { meetingNumber: "asc" } },
                subject: { select: { name: true, code: true } },
                class: { select: { name: true } },
                teacher: { select: { name: true } },
                academicYear: { select: { name: true, semester: true } },
            },
        });
        res.status(201).json({
            success: true,
            message: `RPS berhasil di-generate dengan ${meetings} pertemuan.`,
            data: rpsWithMeetings,
        });
    }
    catch (error) {
        console.error("[RPS Generate]", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// GET /api/rps/:id — detail RPS + semua meeting
router.get("/:id", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const rps = await prisma_1.prisma.rPS.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                meetings: {
                    include: {
                        materials: { orderBy: { order: "asc" } },
                        _count: { select: { materials: true } },
                    },
                    orderBy: { meetingNumber: "asc" },
                },
                subject: true,
                class: true,
                teacher: { select: { name: true, nip: true } },
                academicYear: true,
            },
        });
        res.json({ success: true, data: rps });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// PUT /api/rps/:id — update header RPS
router.put("/:id", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const { learningObjective, learningStrategy, teacherNote } = req.body;
        const updated = await prisma_1.prisma.rPS.update({
            where: { id: Number(req.params.id) },
            data: { learningObjective, learningStrategy, teacherNote },
        });
        res.json({ success: true, message: "RPS berhasil diperbarui.", data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// PUT /api/rps/:id/publish — publish RPS (semua meeting ikut published)
router.put("/:id/publish", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const rpsId = Number(req.params.id);
        const now = new Date();
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.rPS.update({
                where: { id: rpsId },
                data: { status: "published", publishedAt: now },
            }),
            prisma_1.prisma.rPSMeeting.updateMany({
                where: { rpsId },
                data: { status: "published", publishedAt: now },
            }),
        ]);
        res.json({ success: true, message: "RPS berhasil dipublish. Siswa sekarang dapat melihat materi." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// PUT /api/rps/:id/archive — arsipkan RPS
router.put("/:id/archive", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        await prisma_1.prisma.rPS.update({
            where: { id: Number(req.params.id) },
            data: { status: "archived", archivedAt: new Date() },
        });
        res.json({ success: true, message: "RPS berhasil diarsipkan." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// DELETE /api/rps/:id — hapus RPS beserta cascades
router.delete("/:id", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        await prisma_1.prisma.rPS.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: "RPS berhasil dihapus." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// GET /api/rps/:id/bundle — export bundle JSON
router.get("/:id/bundle", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const rps = await prisma_1.prisma.rPS.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                meetings: {
                    include: { materials: true },
                    orderBy: { meetingNumber: "asc" },
                },
                subject: true,
                class: true,
                teacher: { select: { name: true } },
                academicYear: true,
            },
        });
        if (!rps)
            return res.status(404).json({ success: false, message: "RPS tidak ditemukan." });
        const bundle = {
            metadata: {
                nomorInduk1: rps.nomorInduk1,
                nomorInduk2: rps.nomorInduk2,
                nomorInduk3: rps.nomorInduk3,
                subject: rps.subject.name,
                class: rps.class.name,
                teacher: rps.teacher.name,
                academicYear: rps.academicYear.name,
                semester: rps.academicYear.semester,
                totalMeetings: rps.totalMeetings,
                generatedAt: new Date().toISOString(),
            },
            meetings: rps.meetings.map((m) => ({
                meetingNumber: m.meetingNumber,
                title: m.title,
                learningPath: m.learningPath,
                learningGoal: m.learningGoal,
                activity: m.activity,
                assessment: m.assessment,
                status: m.status,
                materials: m.materials.map((mat) => ({
                    title: mat.title,
                    type: mat.type,
                    fileUrl: mat.fileUrl,
                })),
            })),
        };
        res.json({ success: true, data: bundle });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ══════════════════════════════════════════════
// MEETING ENDPOINTS
// ══════════════════════════════════════════════
// PUT /api/rps/:rpsId/meetings/:meetingId — update isi pertemuan
router.put("/:rpsId/meetings/:meetingId", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const meetingId = Number(req.params.meetingId);
        const rpsId = Number(req.params.rpsId);
        // Pastikan meeting ada di RPS ini
        const meeting = await prisma_1.prisma.rPSMeeting.findFirst({
            where: { id: meetingId, rpsId },
        });
        if (!meeting) {
            return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
        }
        const { title, learningPath, learningGoal, activity, assessment } = req.body;
        const updated = await prisma_1.prisma.rPSMeeting.update({
            where: { id: meetingId },
            data: { title, learningPath, learningGoal, activity, assessment },
        });
        res.json({ success: true, message: "Pertemuan berhasil diperbarui.", data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// PUT /api/rps/:rpsId/meetings/:meetingId/publish — publish 1 meeting
router.put("/:rpsId/meetings/:meetingId/publish", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const meetingId = Number(req.params.meetingId);
        const rpsId = Number(req.params.rpsId);
        const meeting = await prisma_1.prisma.rPSMeeting.findFirst({ where: { id: meetingId, rpsId } });
        if (!meeting) {
            return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
        }
        const updated = await prisma_1.prisma.rPSMeeting.update({
            where: { id: meetingId },
            data: { status: "published", publishedAt: new Date() },
        });
        res.json({ success: true, message: "Pertemuan berhasil dipublish.", data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// ══════════════════════════════════════════════
// MATERIAL ENDPOINTS
// ══════════════════════════════════════════════
// POST /api/rps/:rpsId/meetings/:meetingId/materials/upload — upload file
router.post("/:rpsId/meetings/:meetingId/materials/upload", teacherGuard, rpsOwnershipGuard, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "File wajib diupload." });
        }
        const meetingId = Number(req.params.meetingId);
        const rpsId = Number(req.params.rpsId);
        const meeting = await prisma_1.prisma.rPSMeeting.findFirst({ where: { id: meetingId, rpsId } });
        if (!meeting) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
        }
        const { title, order } = req.body;
        const fileType = mimeToType.get(req.file.mimetype) || "pdf";
        const fileUrl = `/uploads/rps-materials/${req.file.filename}`;
        const material = await prisma_1.prisma.rPSMaterial.create({
            data: {
                meetingId,
                title: title || req.file.originalname,
                type: fileType,
                fileUrl,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                order: Number(order) || 0,
            },
        });
        res.status(201).json({ success: true, message: "Materi berhasil diupload.", data: material });
    }
    catch (error) {
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message || "Terjadi kesalahan server." });
    }
});
// POST /api/rps/:rpsId/meetings/:meetingId/materials/link — tambah link
router.post("/:rpsId/meetings/:meetingId/materials/link", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const { title, url, type = "link" } = req.body;
        if (!title || !url) {
            return res.status(400).json({ success: false, message: "Title dan URL wajib diisi." });
        }
        const meetingId = Number(req.params.meetingId);
        const rpsId = Number(req.params.rpsId);
        const meeting = await prisma_1.prisma.rPSMeeting.findFirst({ where: { id: meetingId, rpsId } });
        if (!meeting) {
            return res.status(404).json({ success: false, message: "Pertemuan tidak ditemukan." });
        }
        const material = await prisma_1.prisma.rPSMaterial.create({
            data: { meetingId, title, type: type, fileUrl: url, order: 0 },
        });
        res.status(201).json({ success: true, message: "Link materi berhasil ditambahkan.", data: material });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// DELETE /api/rps/:rpsId/meetings/:meetingId/materials/:materialId — hapus materi
router.delete("/:rpsId/meetings/:meetingId/materials/:materialId", teacherGuard, rpsOwnershipGuard, async (req, res) => {
    try {
        const materialId = Number(req.params.materialId);
        const material = await prisma_1.prisma.rPSMaterial.findUnique({ where: { id: materialId } });
        if (!material) {
            return res.status(404).json({ success: false, message: "Materi tidak ditemukan." });
        }
        // Hapus file fisik jika bukan URL eksternal
        if (!material.fileUrl.startsWith("http")) {
            const filePath = path_1.default.join(process.cwd(), material.fileUrl);
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
        await prisma_1.prisma.rPSMaterial.delete({ where: { id: materialId } });
        res.json({ success: true, message: "Materi berhasil dihapus." });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan server." });
    }
});
// POST /api/rps/:id/import-excel — import data meeting dari Excel
router.post("/:id/import-excel", teacherGuard, rpsOwnershipGuard, upload.single("excel"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "File Excel wajib diupload." });
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const XLSX = require("xlsx");
        const wb = XLSX.readFile(req.file.path);
        // eslint-disable-next-line security/detect-object-injection
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        fs_1.default.unlinkSync(req.file.path);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "File Excel kosong." });
        }
        const rpsId = Number(req.params.id);
        let updatedCount = 0;
        for (const row of rows) {
            const meetingNumber = Number(row["No Pertemuan"]);
            if (!meetingNumber || meetingNumber < 1)
                continue;
            const meeting = await prisma_1.prisma.rPSMeeting.findFirst({ where: { rpsId, meetingNumber } });
            if (meeting) {
                await prisma_1.prisma.rPSMeeting.update({
                    where: { id: meeting.id },
                    data: {
                        title: row["Judul Pertemuan"] || meeting.title,
                        learningPath: row["Alur Pembelajaran"] || null,
                        learningGoal: row["Tujuan Pembelajaran"] || null,
                        activity: row["Aktivitas"] || null,
                        assessment: row["Penilaian"] || null,
                    },
                });
                updatedCount++;
            }
        }
        res.json({
            success: true,
            message: `Import berhasil. ${updatedCount} pertemuan diperbarui.`,
            data: { updatedCount },
        });
    }
    catch (error) {
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: "Gagal import Excel." });
    }
});
exports.default = router;
//# sourceMappingURL=rps.route.js.map