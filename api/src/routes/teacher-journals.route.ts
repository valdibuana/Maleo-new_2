import express, { Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';

const router = express.Router();

// GET /api/teacher-journals - List all journals
router.get('/', verifyJWT, async (req: any, res: Response) => {
  try {
    const { teacherId, classId, subjectId, startDate, endDate, limit, page } = req.query;
    
    // Filter conditions
    let where: any = {};

    // Role based access
    if (req.user?.role === 'teacher') {
      if (!req.user.teacherId) {
        return res.status(403).json({ success: false, message: 'Teacher ID not found' });
      }
      where.teacherId = req.user.teacherId;
    } else if (teacherId) {
      where.teacherId = Number(teacherId);
    }

    if (classId) where.classId = Number(classId);
    if (subjectId) where.subjectId = Number(subjectId);
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Pagination
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [total, journals] = await prisma.$transaction([
      prisma.teacherJournal.count({ where }),
      prisma.teacherJournal.findMany({
        where,
        include: {
          teacher: { select: { id: true, name: true, nip: true } },
          class: { select: { id: true, name: true, level: true } },
          subject: { select: { id: true, name: true, code: true } }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    res.json({
      success: true,
      data: journals,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching teacher journals:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET /api/teacher-journals/:id - Get specific journal
router.get('/:id', verifyJWT, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const journal = await prisma.teacherJournal.findUnique({
      where: { id: Number(id) },
      include: {
        teacher: { select: { id: true, name: true, nip: true } },
        class: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } }
      }
    });

    if (!journal) {
      return res.status(404).json({ success: false, message: 'Journal not found' });
    }

    // Access check for teacher
    if (req.user?.role === 'teacher' && journal.teacherId !== req.user.teacherId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this journal' });
    }

    res.json({ success: true, data: journal });

  } catch (error: any) {
    console.error('Error fetching journal:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST /api/teacher-journals - Create a journal
router.post('/', verifyJWT, async (req: any, res: Response) => {
  try {
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can create journals' });
    }

    const { date, classId, subjectId, material, objective, activityNotes, constraints, followUp } = req.body;
    const teacherId = req.user.teacherId;

    if (!teacherId || !date || !classId || !subjectId || !material || !objective) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const journal = await prisma.teacherJournal.create({
      data: {
        date: new Date(date),
        material,
        objective,
        activityNotes,
        constraints,
        followUp,
        teacherId: Number(teacherId),
        classId: Number(classId),
        subjectId: Number(subjectId)
      }
    });

    res.status(201).json({ success: true, data: journal, message: 'Jurnal berhasil ditambahkan' });

  } catch (error: any) {
    console.error('Error creating journal:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// PUT /api/teacher-journals/:id - Update a journal
router.put('/:id', verifyJWT, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.teacherJournal.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Journal not found' });
    }

    // Access check for teacher
    if (req.user?.role === 'teacher' && existing.teacherId !== req.user.teacherId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this journal' });
    }

    const { date, classId, subjectId, material, objective, activityNotes, constraints, followUp } = req.body;

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (classId) updateData.classId = Number(classId);
    if (subjectId) updateData.subjectId = Number(subjectId);
    if (material !== undefined) updateData.material = material;
    if (objective !== undefined) updateData.objective = objective;
    if (activityNotes !== undefined) updateData.activityNotes = activityNotes;
    if (constraints !== undefined) updateData.constraints = constraints;
    if (followUp !== undefined) updateData.followUp = followUp;

    const journal = await prisma.teacherJournal.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json({ success: true, data: journal, message: 'Jurnal berhasil diupdate' });

  } catch (error: any) {
    console.error('Error updating journal:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// DELETE /api/teacher-journals/:id - Delete a journal
router.delete('/:id', verifyJWT, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.teacherJournal.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Journal not found' });
    }

    // Access check for teacher - Admin/Kepsek can also delete
    if (req.user?.role === 'teacher' && existing.teacherId !== req.user.teacherId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this journal' });
    }

    await prisma.teacherJournal.delete({
      where: { id: Number(id) }
    });

    res.json({ success: true, message: 'Jurnal berhasil dihapus' });

  } catch (error: any) {
    console.error('Error deleting journal:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
