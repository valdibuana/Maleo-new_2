"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.createTestStudent = createTestStudent;
exports.createTestMaterial = createTestMaterial;
exports.cleanupTestData = cleanupTestData;
const client_1 = require("@prisma/client");
const vitest_1 = require("vitest");
// Initialize Prisma Client for tests
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
// Setup before all tests
(0, vitest_1.beforeAll)(async () => {
    console.log('🔧 Setting up test environment...');
    // Connect to database
    await exports.prisma.$connect();
});
// Cleanup after all tests
(0, vitest_1.afterAll)(async () => {
    console.log('🧹 Cleaning up test environment...');
    await exports.prisma.$disconnect();
});
// Helper function to create test data
async function createTestStudent() {
    const user = await exports.prisma.user.create({
        data: {
            name: `Test Student ${Date.now()}`,
            email: `test_${Date.now()}@test.com`,
            password: 'test_hash',
            role: 'student',
            userCode: `TEST_${Date.now()}`,
        },
    });
    // Find or create a test class
    let classEntity = await exports.prisma.class.findFirst();
    if (!classEntity) {
        // Create a test teacher first for homeroom
        const testTeacher = await exports.prisma.teacher.findFirst();
        if (!testTeacher) {
            throw new Error('No teacher found. Please seed database first with: npm run db:seed');
        }
        // Create a test class if none exists
        classEntity = await exports.prisma.class.create({
            data: {
                name: 'Test Class 7A',
                level: 7,
                homeroomTeacherId: testTeacher.id,
            },
        });
    }
    const student = await exports.prisma.student.create({
        data: {
            nis: `TEST${Date.now()}`,
            name: 'Test Student',
            classId: classEntity.id,
        },
    });
    // Link user to student
    await exports.prisma.user.update({
        where: { id: user.id },
        data: { studentId: student.id },
    });
    return { user, student };
}
async function createTestMaterial() {
    // First, ensure we have a subject, class, academic year, and teacher
    const subject = await exports.prisma.subject.findFirst();
    if (!subject) {
        throw new Error('No subject found. Please seed database first with: npm run db:seed');
    }
    const classEntity = await exports.prisma.class.findFirst();
    if (!classEntity) {
        throw new Error('No class found. Please seed database first with: npm run db:seed');
    }
    const academicYear = await exports.prisma.academicYear.findFirst();
    if (!academicYear) {
        throw new Error('No academic year found. Please seed database first with: npm run db:seed');
    }
    // Create a test teacher if none exists
    let teacher = await exports.prisma.teacher.findFirst();
    if (!teacher) {
        const teacherUser = await exports.prisma.user.create({
            data: {
                name: `Test Teacher for Setup ${Date.now()}`,
                email: `testteacher_setup_${Date.now()}@test.com`,
                password: 'test_hash',
                role: 'teacher',
                userCode: `TESTTEACHER_SETUP_${Date.now()}`,
            },
        });
        teacher = await exports.prisma.teacher.create({
            data: {
                nip: `TESTSETUP${Date.now()}`,
                name: 'Test Teacher Setup',
                email: `testteacher_setup_${Date.now()}@test.com`,
            },
        });
        await exports.prisma.user.update({
            where: { id: teacherUser.id },
            data: { teacherId: teacher.id },
        });
    }
    const module = await exports.prisma.learningModule.create({
        data: {
            title: 'Test Module',
            subjectId: subject.id,
            classId: classEntity.id,
            academicYearId: academicYear.id,
            teacherId: teacher.id,
        },
    });
    const session = await exports.prisma.moduleSession.create({
        data: {
            moduleId: module.id,
            sessionNumber: 1,
            title: 'Test Session',
        },
    });
    const material = await exports.prisma.sessionMaterial.create({
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
async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    // Find test users first (using userCode that starts with TEST_)
    const testUsers = await exports.prisma.user.findMany({
        where: {
            userCode: { startsWith: 'TEST_' }
        },
        select: { id: true, studentId: true }
    });
    const testUserIds = testUsers.map(u => u.id);
    const testStudentIds = testUsers
        .filter(u => u.studentId !== null)
        .map(u => u.studentId);
    if (testStudentIds.length > 0) {
        // Delete material access records
        await exports.prisma.studentMaterialAccess.deleteMany({
            where: { studentId: { in: testStudentIds } }
        });
    }
    if (testUserIds.length > 0) {
        // Unlink users from students first
        await exports.prisma.user.updateMany({
            where: { id: { in: testUserIds } },
            data: { studentId: null }
        });
    }
    if (testStudentIds.length > 0) {
        // Delete students
        await exports.prisma.student.deleteMany({
            where: { id: { in: testStudentIds } }
        });
    }
    if (testUserIds.length > 0) {
        // Delete users
        await exports.prisma.user.deleteMany({
            where: { id: { in: testUserIds } }
        });
    }
    // Clean up test modules and materials
    await exports.prisma.sessionMaterial.deleteMany({
        where: {
            session: {
                module: {
                    title: 'Test Module'
                }
            }
        }
    });
    await exports.prisma.moduleSession.deleteMany({
        where: {
            module: {
                title: 'Test Module'
            }
        }
    });
    await exports.prisma.learningModule.deleteMany({
        where: {
            title: 'Test Module'
        }
    });
}
//# sourceMappingURL=setup.js.map