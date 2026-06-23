"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaterials = exports.trackAccess = exports.deleteMaterial = exports.createLinkMaterial = exports.uploadMaterialFile = exports.deleteSession = exports.updateSession = exports.createSession = exports.deleteModule = exports.updateModule = exports.createModule = exports.getModules = exports.getClasses = exports.getSubjects = void 0;
const prisma_1 = require("../lib/prisma");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ──────────────────────────────────────────────
// FILTER DATA (FOR DROPDOWNS)
// ──────────────────────────────────────────────
const getSubjects = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        console.log("[LMS] Fetching subjects for user:", userId, "Role:", role);
        if (role !== "teacher") {
            // Students and Guardians see subjects related to their modules, 
            // but for the filter dropdown, let's keep it simple or based on their class
            return res.json({ success: true, data: [] });
        }
        const teacher = await prisma_1.prisma.teacher.findFirst({
            where: { user: { id: userId } },
            include: { subjects: { select: { id: true, name: true, code: true } } }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Profil guru tidak ditemukan" });
        }
        res.json({ success: true, data: teacher.subjects });
    }
    catch (error) {
        console.error("[LMS] getSubjects error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data mata pelajaran" });
    }
};
exports.getSubjects = getSubjects;
const getClasses = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        if (role !== "teacher")
            return res.json({ success: true, data: [] });
        const teacher = await prisma_1.prisma.teacher.findFirst({
            where: { user: { id: userId } },
            include: {
                homeroomClasses: { select: { id: true, name: true, level: true } },
                schedules: { select: { class: { select: { id: true, name: true, level: true } } }, distinct: ['classId'] },
                teacherSubjects: { include: { subject: { select: { gradeLevel: true } } } }
            }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Profil guru tidak ditemukan" });
        }
        // Combine homeroom and scheduled classes
        const classesMap = new Map();
        teacher.homeroomClasses.forEach(c => classesMap.set(c.id, c));
        teacher.schedules.forEach(s => classesMap.set(s.class.id, s.class));
        // Include classes from the grade levels they are assigned to teach
        const gradeLevels = Array.from(new Set(teacher.teacherSubjects.map((ts) => ts.subject.gradeLevel)));
        if (gradeLevels.length > 0) {
            const subjectClasses = await prisma_1.prisma.class.findMany({
                where: { level: { in: gradeLevels } },
                select: { id: true, name: true, level: true }
            });
            subjectClasses.forEach((c) => classesMap.set(c.id, c));
        }
        res.json({ success: true, data: Array.from(classesMap.values()) });
    }
    catch (error) {
        console.error("[LMS] getClasses error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data kelas" });
    }
};
exports.getClasses = getClasses;
// ──────────────────────────────────────────────
// MODULES
// ──────────────────────────────────────────────
const getModules = async (req, res) => {
    try {
        const { subjectId, academicYearId, classId } = req.query;
        const { id: userId, role } = req.user;
        console.log(`[LMS] getModules for User: ${userId}, Role: ${role}`);
        const where = {};
        if (subjectId)
            where.subjectId = Number(subjectId);
        if (academicYearId)
            where.academicYearId = Number(academicYearId);
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({
                where: { user: { id: userId } }
            });
            if (!teacher) {
                return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
            }
            where.teacherId = teacher.id;
            if (classId)
                where.classId = Number(classId);
        }
        else if (role === "student") {
            const student = await prisma_1.prisma.student.findFirst({
                where: { user: { id: userId } }
            });
            if (student) {
                // Siswa bisa melihat modul untuk kelasnya ATAU modul global (classId null)
                where.OR = [
                    { classId: student.classId, isPublished: true },
                    { classId: null, isPublished: true },
                ];
            }
        }
        else if (role === "guardian") {
            const guardian = await prisma_1.prisma.guardian.findFirst({
                where: { user: { id: userId } },
                include: { students: { select: { classId: true } } }
            });
            if (guardian) {
                const classIds = guardian.students.map(s => s.classId);
                where.classId = { in: classIds };
                where.isPublished = true;
            }
        }
        const modules = await prisma_1.prisma.learningModule.findMany({
            where,
            include: {
                sessions: {
                    where: (role === "student" || role === "guardian") ? { isPublished: true } : {},
                    include: {
                        materials: {
                            orderBy: { order: "asc" },
                            include: role === "teacher" ? { _count: { select: { access: true } } } : undefined
                        }
                    },
                    orderBy: { sessionNumber: "asc" }
                },
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                class: { select: { name: true } }
            },
            orderBy: { order: "asc" }
        });
        res.json({ success: true, data: modules });
    }
    catch (error) {
        console.error("[LMS] getModules error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data modul." });
    }
};
exports.getModules = getModules;
const createModule = async (req, res) => {
    try {
        const { title, description, subjectId, academicYearId, classId, order } = req.body;
        const { id: userId } = req.user;
        if (!subjectId || !academicYearId) {
            return res.status(400).json({ success: false, message: "Mata pelajaran dan Tahun Akademik wajib dipilih." });
        }
        const teacher = await prisma_1.prisma.teacher.findFirst({
            where: { user: { id: userId } },
            include: {
                subjects: true,
                homeroomClasses: true,
                schedules: { select: { classId: true } }
            }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Guru tidak ditemukan." });
        }
        // Hard Security: Verify teacher teaches this subject
        const teachesSubject = teacher.subjects.some(s => s.id === Number(subjectId));
        if (!teachesSubject) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke mata pelajaran ini."
            });
        }
        // Optional Security: If classId is provided, verify teacher teaches in that class
        if (classId) {
            const teachesInClass = teacher.schedules.some(s => s.classId === Number(classId)) ||
                teacher.homeroomClasses.some(c => c.id === Number(classId));
            if (!teachesInClass) {
                return res.status(403).json({
                    success: false,
                    message: "Anda tidak memiliki akses ke kelas ini."
                });
            }
        }
        const module = await prisma_1.prisma.learningModule.create({
            data: {
                title,
                description,
                subjectId: Number(subjectId),
                academicYearId: Number(academicYearId),
                classId: classId ? Number(classId) : null,
                teacherId: teacher.id,
                order: order || 0
            }
        });
        res.status(201).json({ success: true, data: module });
    }
    catch (error) {
        console.error("[LMS] createModule error:", error);
        res.status(500).json({ success: false, message: "Gagal membuat modul." });
    }
};
exports.createModule = createModule;
const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, order, isPublished } = req.body;
        const { id: userId, role } = req.user;
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({ where: { user: { id: userId } } });
            const module = await prisma_1.prisma.learningModule.findUnique({ where: { id: Number(id) } });
            if (!teacher || module?.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke modul ini." });
            }
        }
        const module = await prisma_1.prisma.learningModule.update({
            where: { id: Number(id) },
            data: { title, description, order, isPublished }
        });
        res.json({ success: true, data: module });
    }
    catch (error) {
        console.error("[LMS] updateModule error:", error);
        res.status(500).json({ success: false, message: "Gagal memperbarui modul." });
    }
};
exports.updateModule = updateModule;
const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({ where: { user: { id: userId } } });
            const module = await prisma_1.prisma.learningModule.findUnique({ where: { id: Number(id) } });
            if (!teacher || module?.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke modul ini." });
            }
        }
        await prisma_1.prisma.learningModule.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: "Modul berhasil dihapus." });
    }
    catch (error) {
        console.error("[LMS] deleteModule error:", error);
        res.status(500).json({ success: false, message: "Gagal menghapus modul." });
    }
};
exports.deleteModule = deleteModule;
const createSession = async (req, res) => {
    try {
        const { moduleId, title, sessionNumber, isRepeatable, isPublished } = req.body;
        const { id: userId, role } = req.user;
        // Validation
        const module = await prisma_1.prisma.learningModule.findUnique({ where: { id: Number(moduleId) } });
        if (!module)
            return res.status(404).json({ success: false, message: "Modul tidak ditemukan." });
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({ where: { user: { id: userId } } });
            if (!teacher || module.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke modul ini." });
            }
        }
        const session = await prisma_1.prisma.moduleSession.create({
            data: {
                moduleId: Number(moduleId),
                title,
                sessionNumber: Number(sessionNumber),
                isRepeatable: !!isRepeatable,
                isPublished: !!isPublished
            }
        });
        res.status(201).json({ success: true, data: session });
    }
    catch (error) {
        console.error("[LMS] createSession error:", error);
        res.status(500).json({ success: false, message: "Gagal membuat sesi pertemuan." });
    }
};
exports.createSession = createSession;
const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, sessionNumber, isRepeatable, isPublished } = req.body;
        const { id: userId, role } = req.user;
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({ where: { user: { id: userId } } });
            const session = await prisma_1.prisma.moduleSession.findUnique({
                where: { id: Number(id) },
                include: { module: true }
            });
            if (!teacher || session?.module.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke sesi ini." });
            }
        }
        const session = await prisma_1.prisma.moduleSession.update({
            where: { id: Number(id) },
            data: { title, sessionNumber, isRepeatable, isPublished }
        });
        res.json({ success: true, data: session });
    }
    catch (error) {
        console.error("[LMS] updateSession error:", error);
        res.status(500).json({ success: false, message: "Gagal memperbarui sesi." });
    }
};
exports.updateSession = updateSession;
const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({ where: { user: { id: userId } } });
            const session = await prisma_1.prisma.moduleSession.findUnique({
                where: { id: Number(id) },
                include: { module: true }
            });
            if (!teacher || session?.module.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke sesi ini." });
            }
        }
        await prisma_1.prisma.moduleSession.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: "Sesi berhasil dihapus." });
    }
    catch (error) {
        console.error("[LMS] deleteSession error:", error);
        res.status(500).json({ success: false, message: "Gagal menghapus sesi." });
    }
};
exports.deleteSession = deleteSession;
const uploadMaterialFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Tidak ada file yang diunggah." });
        }
        const { sessionId, title, type, order } = req.body;
        const fileUrl = `/uploads/materials/${req.file.filename}`;
        const material = await prisma_1.prisma.sessionMaterial.create({
            data: {
                sessionId: Number(sessionId),
                title,
                type: type,
                fileUrl,
                order: order ? Number(order) : 0
            }
        });
        res.status(201).json({ success: true, data: material });
    }
    catch (error) {
        console.error("[LMS] uploadMaterialFile error:", error);
        res.status(500).json({ success: false, message: "Gagal mengunggah materi." });
    }
};
exports.uploadMaterialFile = uploadMaterialFile;
const createLinkMaterial = async (req, res) => {
    try {
        const { sessionId, title, type, fileUrl, order } = req.body;
        if (type !== 'link') {
            return res.status(400).json({ success: false, message: "Tipe harus berupa link." });
        }
        const material = await prisma_1.prisma.sessionMaterial.create({
            data: {
                sessionId: Number(sessionId),
                title,
                type: 'link',
                fileUrl,
                order: order ? Number(order) : 0
            }
        });
        res.status(201).json({ success: true, data: material });
    }
    catch (error) {
        console.error("[LMS] createLinkMaterial error:", error);
        res.status(500).json({ success: false, message: "Gagal menyimpan tautan." });
    }
};
exports.createLinkMaterial = createLinkMaterial;
const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        const material = await prisma_1.prisma.sessionMaterial.findUnique({
            where: { id: Number(id) },
            include: { session: { include: { module: true } } }
        });
        if (!material)
            return res.status(404).json({ success: false, message: "Materi tidak ditemukan." });
        if (role === "teacher") {
            const teacher = await prisma_1.prisma.teacher.findFirst({ where: { user: { id: userId } } });
            if (!teacher || material.session.module.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk menghapus materi ini." });
            }
        }
        // Delete file from disk
        const filePath = path_1.default.join(__dirname, "../../", material.fileUrl);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        await prisma_1.prisma.sessionMaterial.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: "Materi berhasil dihapus." });
    }
    catch (error) {
        console.error("[LMS] deleteMaterial error:", error);
        res.status(500).json({ success: false, message: "Gagal menghapus materi." });
    }
};
exports.deleteMaterial = deleteMaterial;
const trackAccess = async (req, res) => {
    try {
        const { id: materialId } = req.params;
        const { id: userId, role } = req.user;
        if (role !== "student") {
            console.error("[LMS] trackAccess: Non-student role attempted to track access", { userId, role });
            return res.status(403).json({ success: false, message: "Hanya siswa yang dapat merekam akses materi." });
        }
        const student = await prisma_1.prisma.student.findFirst({ where: { user: { id: userId } } });
        if (!student) {
            console.error("[LMS] trackAccess: Student profile not found", { userId });
            return res.status(404).json({ success: false, message: "Profil siswa tidak ditemukan." });
        }
        await prisma_1.prisma.studentMaterialAccess.upsert({
            where: {
                studentId_materialId: {
                    studentId: student.id,
                    materialId: Number(materialId)
                }
            },
            create: {
                studentId: student.id,
                materialId: Number(materialId)
            },
            update: {
                accessedAt: new Date()
            }
        });
        res.json({ success: true, message: "Akses berhasil direkam." });
    }
    catch (error) {
        console.error("[LMS] trackAccess error:", error);
        res.status(500).json({ success: false, message: "Gagal merekam akses materi." });
    }
};
exports.trackAccess = trackAccess;
const getMaterials = async (req, res) => {
    try {
        const { sessionId } = req.query;
        const materials = await prisma_1.prisma.sessionMaterial.findMany({
            where: { sessionId: sessionId ? Number(sessionId) : undefined },
            orderBy: { order: "asc" }
        });
        res.json({ success: true, data: materials });
    }
    catch (error) {
        console.error("[LMS] getMaterials error:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil data materi." });
    }
};
exports.getMaterials = getMaterials;
//# sourceMappingURL=lms.controller.js.map