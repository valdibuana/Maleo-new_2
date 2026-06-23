import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Initialize Prisma Client for tests
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Setup before all tests
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');
  // Connect to database
  await prisma.$connect();
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  await prisma.$disconnect();
});

// Helper function to create test data
export async function createTestStudent() {
  const user = await prisma.user.create({
    data: {
      name: `Test Student ${Date.now()}`,
      email: `test_${Date.now()}@test.com`,
      password: 'test_hash',
      role: 'student',
      userCode: `TEST_${Date.now()}`,
    },
  });

  // Find or create a test class
  let classEntity = await prisma.class.findFirst();
  if (!classEntity) {
    // Create a test teacher first for homeroom
    const testTeacher = await prisma.teacher.findFirst();
    if (!testTeacher) {
      throw new Error('No teacher found. Please seed database first with: npm run db:seed');
    }

    // Create a test class if none exists
    classEntity = await prisma.class.create({
      data: {
        name: 'Test Class 7A',
        level: 7,
        homeroomTeacherId: testTeacher.id,
      },
    });
  }

  const student = await prisma.student.create({
    data: {
      nis: `TEST${Date.now()}`,
      name: 'Test Student',
      classId: classEntity.id,
    },
  });

  // Link user to student
  await prisma.user.update({
    where: { id: user.id },
    data: { studentId: student.id },
  });

  return { user, student };
}

export async function createTestMaterial() {
  // First, ensure we have a subject, class, academic year, and teacher
  const subject = await prisma.subject.findFirst();
  if (!subject) {
    throw new Error('No subject found. Please seed database first with: npm run db:seed');
  }

  const classEntity = await prisma.class.findFirst();
  if (!classEntity) {
    throw new Error('No class found. Please seed database first with: npm run db:seed');
  }

  const academicYear = await prisma.academicYear.findFirst();
  if (!academicYear) {
    throw new Error('No academic year found. Please seed database first with: npm run db:seed');
  }

  // Create a test teacher if none exists
  let teacher = await prisma.teacher.findFirst();
  if (!teacher) {
    const teacherUser = await prisma.user.create({
      data: {
        name: `Test Teacher for Setup ${Date.now()}`,
        email: `testteacher_setup_${Date.now()}@test.com`,
        password: 'test_hash',
        role: 'teacher',
        userCode: `TESTTEACHER_SETUP_${Date.now()}`,
      },
    });

    teacher = await prisma.teacher.create({
      data: {
        nip: `TESTSETUP${Date.now()}`,
        name: 'Test Teacher Setup',
        email: `testteacher_setup_${Date.now()}@test.com`,
      },
    });

    await prisma.user.update({
      where: { id: teacherUser.id },
      data: { teacherId: teacher.id },
    });
  }

  const module = await prisma.learningModule.create({
    data: {
      title: 'Test Module',
      subjectId: subject.id,
      classId: classEntity.id,
      academicYearId: academicYear.id,
      teacherId: teacher.id,
    },
  });

  const session = await prisma.moduleSession.create({
    data: {
      moduleId: module.id,
      sessionNumber: 1,
      title: 'Test Session',
    },
  });

  const material = await prisma.sessionMaterial.create({
    data: {
      sessionId: session.id,
      title: 'Test Material',
      type: 'pdf',
      fileUrl: '/test.pdf',
      order: 1,
    },
  });

  return { module, session, material };
}

export async function cleanupTestData() {
  // Clean up in reverse order of dependencies
  
  // Find test users first (using userCode that starts with TEST_)
  const testUsers = await prisma.user.findMany({
    where: {
      userCode: { startsWith: 'TEST_' }
    },
    select: { id: true, studentId: true }
  });
  
  const testUserIds = testUsers.map(u => u.id);
  const testStudentIds = testUsers
    .filter(u => u.studentId !== null)
    .map(u => u.studentId as number);
  
  if (testStudentIds.length > 0) {
    // Delete material access records
    await prisma.studentMaterialAccess.deleteMany({
      where: { studentId: { in: testStudentIds } }
    });
  }
  
  if (testUserIds.length > 0) {
    // Unlink users from students first
    await prisma.user.updateMany({
      where: { id: { in: testUserIds } },
      data: { studentId: null }
    });
  }
  
  if (testStudentIds.length > 0) {
    // Delete students
    await prisma.student.deleteMany({
      where: { id: { in: testStudentIds } }
    });
  }
  
  if (testUserIds.length > 0) {
    // Delete users
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } }
    });
  }

  // Clean up test modules and materials
  await prisma.sessionMaterial.deleteMany({
    where: {
      session: {
        module: {
          title: 'Test Module'
        }
      }
    }
  });

  await prisma.moduleSession.deleteMany({
    where: {
      module: {
        title: 'Test Module'
      }
    }
  });

  await prisma.learningModule.deleteMany({
    where: {
      title: 'Test Module'
    }
  });
}
