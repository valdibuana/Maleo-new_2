import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { checkRole } from "../middleware/role";

const router = Router();

// Bobot default sistem
const DEFAULT_COMPONENTS = [
  { name: "Tugas", weight: 30.0, order: 1, isDefault: true },
  { name: "PSTS",  weight: 30.0, order: 2, isDefault: true },
  { name: "PSAS",  weight: 40.0, order: 3, isDefault: true },
  { name: "Kuis",  weight: 0.0,  order: 4, isDefault: true },
];

// GET /api/grade-config?teacherId=&subjectId=&classId=
router.get("/", verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { teacherId, subjectId, classId } = req.query;

    if (!teacherId || !subjectId || !classId) {
      res.status(400).json({
        success: false,
        message: "teacherId, subjectId, dan classId wajib diisi"
      });
      return;
    }

    // Cari config existing
    let config = await prisma.gradeConfig.findUnique({
      where: {
        teacherId_subjectId_classId: {
          teacherId: Number(teacherId),
          subjectId: Number(subjectId),
          classId: Number(classId),
        }
      },
      include: {
        components: { orderBy: { order: "asc" } }
      }
    });

    // Auto-create dengan default jika belum ada
    if (!config) {
      config = await prisma.gradeConfig.create({
        data: {
          teacherId: Number(teacherId),
          subjectId: Number(subjectId),
          classId: Number(classId),
          components: {
            create: DEFAULT_COMPONENTS
          }
        },
        include: {
          components: { orderBy: { order: "asc" } }
        }
      });
    }

    // Hitung total bobot
    const totalWeight = config.components.reduce(
      (sum, c) => sum + c.weight, 0
    );

    res.json({
      success: true,
      data: {
        ...config,
        totalWeight,
        isValid: Math.round(totalWeight) === 100,
        formula: config.components
          .filter(c => c.weight > 0)
          .map(c => `(${c.name} × ${c.weight}%)`)
          .join(" + ")
      }
    });
  } catch (error) {
    console.error("[GradeConfig] GET error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server"
    });
  }
});

// GET /api/grade-config/summary
router.get(
  "/summary",
  verifyJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const { subjectId, classId } = req.query;

      if (!subjectId || !classId) {
        res.status(400).json({
          success: false,
          message: "subjectId dan classId wajib diisi"
        });
        return;
      }

      const config = await prisma.gradeConfig.findFirst({
        where: {
          subjectId: Number(subjectId),
          classId: Number(classId),
        },
        include: {
          components: { orderBy: { order: "asc" } }
        }
      });

      const students = await prisma.student.findMany({
        where: {
          classId: Number(classId),
          status: "active"
        },
        select: { id: true, name: true, nis: true }
      });

      const grades = await prisma.grade.findMany({
        where: {
          subjectId: Number(subjectId),
          student: { classId: Number(classId) }
        }
      });

      const summary = students.map(student => {
        const studentGrades = grades.filter(
          g => g.studentId === student.id
        );

        const avgByType: Record<string, number> = {};
        const countByType: Record<string, number> = {};

        studentGrades.forEach(g => {
          const pct = (g.score / g.maxScore) * 100;
          if (!avgByType[g.type]) {
            avgByType[g.type] = 0;
            countByType[g.type] = 0;
          }
          avgByType[g.type] += pct;
          countByType[g.type]++;
        });

        Object.keys(avgByType).forEach(type => {
          avgByType[type] = avgByType[type] / countByType[type];
        });

        let finalScore = 0;
        let totalAppliedWeight = 0;

        if (config?.components) {
          config.components.forEach(comp => {
            if (comp.weight > 0 && avgByType[comp.name] !== undefined) {
              finalScore += (avgByType[comp.name] * comp.weight) / 100;
              totalAppliedWeight += comp.weight;
            }
          });

          if (totalAppliedWeight > 0 && totalAppliedWeight < 100) {
            finalScore = (finalScore / totalAppliedWeight) * 100;
          }
        } else {
          const allScores = Object.values(avgByType);
          finalScore = allScores.length > 0
            ? allScores.reduce((a, b) => a + b, 0) / allScores.length
            : 0;
        }

        const getGradeLabel = (score: number) => {
          if (score >= 90) return { letter: "A", label: "Istimewa" };
          if (score >= 80) return { letter: "B", label: "Baik" };
          if (score >= 70) return { letter: "C", label: "Cukup" };
          if (score >= 60) return { letter: "D", label: "Perlu Usaha" };
          return { letter: "E", label: "Kurang" };
        };

        const gradeInfo = getGradeLabel(finalScore);

        return {
          studentId: student.id,
          studentName: student.name,
          studentNis: student.nis,
          scoreByType: avgByType,
          finalScore: Math.round(finalScore * 10) / 10,
          gradeLetter: gradeInfo.letter,
          gradeLabel: gradeInfo.label,
          hasAllComponents: config?.components
            .filter(c => c.weight > 0)
            .every(c => avgByType[c.name] !== undefined) ?? false,
        };
      });

      res.json({
        success: true,
        data: {
          config: config || null,
          formula: config?.components
            .filter(c => c.weight > 0)
            .map(c => `${c.name} × ${c.weight}%`)
            .join(" + ") || "Rata-rata sederhana",
          summary,
        }
      });
    } catch (error) {
      console.error("[GradeConfig] Summary error:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server"
      });
    }
  }
);

// PUT /api/grade-config/:id
router.put(
  "/:id",
  verifyJWT,
  checkRole("admin", "teacher"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { components } = req.body;

      if (!components || !Array.isArray(components)) {
        res.status(400).json({
          success: false,
          message: "components array wajib diisi"
        });
        return;
      }

      const totalWeight = components.reduce(
        (sum: number, c: any) => sum + Number(c.weight), 0
      );

      if (Math.round(totalWeight) !== 100) {
        res.status(400).json({
          success: false,
          message: `Total bobot harus 100%. Saat ini: ${totalWeight.toFixed(1)}%`
        });
        return;
      }

      const hasNegative = components.some((c: any) => Number(c.weight) < 0);
      if (hasNegative) {
        res.status(400).json({
          success: false,
          message: "Bobot tidak boleh negatif"
        });
        return;
      }

      const configId = Number(req.params.id);

      await prisma.$transaction(async (tx) => {
        await tx.gradeComponent.deleteMany({
          where: { gradeConfigId: configId }
        });

        await tx.gradeComponent.createMany({
          data: components.map((c: any, i: number) => ({
            gradeConfigId: configId,
            name: c.name,
            weight: Number(c.weight),
            isDefault: c.isDefault ?? false,
            order: i + 1,
          }))
        });
      });

      const updated = await prisma.gradeConfig.findUnique({
        where: { id: configId },
        include: {
          components: { orderBy: { order: "asc" } }
        }
      });

      res.json({
        success: true,
        message: "Konfigurasi bobot berhasil diperbarui",
        data: updated
      });
    } catch (error) {
      console.error("[GradeConfig] PUT error:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server"
      });
    }
  }
);

export default router;
