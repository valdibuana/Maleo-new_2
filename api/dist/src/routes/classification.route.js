"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
// Kategorisasi mapel — disesuaikan dengan data master Subject SIAKAD Maleo
// PENTING: urutan pengecekan: sains → vokasi → sosial.
//   - `tik` DIHAPUS dari sains karena mencocokkan substring "prak-tik" (vokasi).
//   - Pattern panjang (e.g. "ilmu pengetahuan alam") ditaruh lebih awal agar presisi.
//   - PJOK dipindah ke Vokasi sesuai spek task (Seni Budaya, Prakarya, PJOK).
const regexSains = /matematika|ilmu pengetahuan alam|ipa|informatika|fisika|kimia|biologi|komputer|literasi digital/i;
const regexVokasi = /seni budaya|prakarya|pkwu|kwu|seni|budaya|kejuruan|produktif|praktik|mulok|desain|rekayasa|pendidikan jasmani|jasmani|pjok|penjas|olahraga/i;
const regexSosial = /bahasa indonesia|bahasa inggris|ilmu pengetahuan sosial|ips|pendidikan agama|budi pekerti|pendidikan pancasila|pancasila|pkn|sejarah|geografi|ekonomi|sosiologi|bahasa|agama|sastra/i;
router.get("/student/:studentId", auth_1.verifyJWT, (0, role_1.checkRole)("admin", "teacher", "student", "guardian"), async (req, res) => {
    try {
        const studentId = Number(req.params.studentId);
        // Verifikasi akses jika user bukan admin/teacher
        if (req.user?.role === "student") {
            // Harus memverifikasi studentId ini adalah miliknya
            // Kita periksa user.studentId (dengan mencari student via nipNis)
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.id },
                select: { nipNis: true }
            });
            const student = await prisma_1.prisma.student.findUnique({
                where: { nis: user?.nipNis || "" }
            });
            if (student?.id !== studentId) {
                return res.status(403).json({ success: false, message: "Akses ditolak." });
            }
        }
        if (req.user?.role === "guardian") {
            // Harus memverifikasi anak ini milik guardian
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.id },
                include: { guardian: { include: { students: { select: { id: true } } } } }
            });
            const isMyChild = user?.guardian?.students.some(s => s.id === studentId);
            if (!isMyChild) {
                return res.status(403).json({ success: false, message: "Akses ditolak." });
            }
        }
        // 1. Dapatkan classId siswa saat ini
        const student = await prisma_1.prisma.student.findUnique({
            where: { id: studentId },
            select: { classId: true }
        });
        if (!student) {
            return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
        }
        // 2. Dapatkan AcademicYear aktif
        const activeYear = await prisma_1.prisma.academicYear.findFirst({
            where: { isActive: true }
        });
        if (!activeYear) {
            return res.status(404).json({ success: false, message: "Tidak ada tahun ajaran aktif." });
        }
        const semesterNum = activeYear.semester === "Ganjil" ? 1 : 2;
        // 3. Cek apakah sudah ada klasifikasi untuk semester ini
        let classification = await prisma_1.prisma.studentClassification.findUnique({
            where: {
                studentId_academicYearId_semester: {
                    studentId,
                    academicYearId: activeYear.id,
                    semester: semesterNum
                }
            }
        });
        if (classification) {
            return res.json({ success: true, data: classification });
        }
        // 4. Jika belum ada, jalankan Algoritma Klasifikasi
        // Dapatkan semua nilai siswa di tahun ajaran aktif (berdasarkan range tanggal)
        const grades = await prisma_1.prisma.grade.findMany({
            where: {
                studentId,
                date: {
                    gte: activeYear.startDate,
                    lte: activeYear.endDate
                }
            },
            include: {
                subject: true
            }
        });
        // Hitung nilai akhir per mapel
        const subjectGrades = {};
        grades.forEach(g => {
            if (!subjectGrades[g.subjectId]) {
                subjectGrades[g.subjectId] = { name: g.subject.name, types: {}, avg: 0 };
            }
            if (!subjectGrades[g.subjectId].types[g.type]) {
                subjectGrades[g.subjectId].types[g.type] = { total: 0, count: 0 };
            }
            const pct = (g.score / g.maxScore) * 100;
            subjectGrades[g.subjectId].types[g.type].total += pct;
            subjectGrades[g.subjectId].types[g.type].count++;
        });
        // Dapatkan GradeConfig untuk menghitung nilai final per mapel
        const finalScores = {};
        for (const subjectIdStr in subjectGrades) {
            const subjectId = Number(subjectIdStr);
            const subjData = subjectGrades[subjectId];
            const config = await prisma_1.prisma.gradeConfig.findFirst({
                where: { subjectId, classId: student.classId },
                include: { components: true }
            });
            let finalScore = 0;
            let totalAppliedWeight = 0;
            if (config?.components && config.components.length > 0) {
                config.components.forEach(comp => {
                    const typeData = subjData.types[comp.name];
                    if (comp.weight > 0 && typeData) {
                        const typeAvg = typeData.total / typeData.count;
                        finalScore += (typeAvg * comp.weight) / 100;
                        totalAppliedWeight += comp.weight;
                    }
                });
                if (totalAppliedWeight > 0 && totalAppliedWeight < 100) {
                    finalScore = (finalScore / totalAppliedWeight) * 100;
                }
            }
            else {
                // Default average if no config
                let sum = 0;
                let count = 0;
                Object.values(subjData.types).forEach(t => {
                    sum += t.total / t.count;
                    count++;
                });
                finalScore = count > 0 ? sum / count : 0;
            }
            finalScores[subjectId] = finalScore;
        }
        // 5. Kategorisasi Nilai ke dalam Cluster
        let sainsTotal = 0, sainsCount = 0;
        let sosialTotal = 0, sosialCount = 0;
        let vokasiTotal = 0, vokasiCount = 0;
        for (const subjectIdStr in subjectGrades) {
            const subjectId = Number(subjectIdStr);
            const name = subjectGrades[subjectId].name;
            const score = finalScores[subjectId];
            if (regexSains.test(name)) {
                sainsTotal += score;
                sainsCount++;
            }
            else if (regexVokasi.test(name)) {
                vokasiTotal += score;
                vokasiCount++;
            }
            else if (regexSosial.test(name)) {
                sosialTotal += score;
                sosialCount++;
            }
        }
        const sainsAvg = sainsCount > 0 ? sainsTotal / sainsCount : 0;
        const sosialAvg = sosialCount > 0 ? sosialTotal / sosialCount : 0;
        const vokasiAvg = vokasiCount > 0 ? vokasiTotal / vokasiCount : 0;
        // 6. Simpan Hasil Klasifikasi (hanya analysisData yang dipakai frontend)
        const analysisData = {
            sains: { avg: Math.round(sainsAvg * 10) / 10, count: sainsCount },
            sosial: { avg: Math.round(sosialAvg * 10) / 10, count: sosialCount },
            vokasi: { avg: Math.round(vokasiAvg * 10) / 10, count: vokasiCount }
        };
        classification = await prisma_1.prisma.studentClassification.create({
            data: {
                studentId,
                semester: semesterNum,
                academicYearId: activeYear.id,
                pathType: "AKADEMIK",
                topInterest: "-",
                analysisData
            }
        });
        res.json({ success: true, data: classification });
    }
    catch (error) {
        console.error("[Classification] GET /student/:id error:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
    }
});
exports.default = router;
//# sourceMappingURL=classification.route.js.map