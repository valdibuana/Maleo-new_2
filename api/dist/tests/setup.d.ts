import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function createTestStudent(): Promise<{
    user: {
        id: number;
        role: import(".prisma/client").$Enums.Role;
        password: string;
        name: string;
        email: string | null;
        username: string | null;
        createdAt: Date;
        updatedAt: Date;
        force_change_password: boolean;
        guardianId: number | null;
        nipNis: string | null;
        principalId: number | null;
        studentId: number | null;
        teacherId: number | null;
        userCode: string | null;
    };
    student: {
        id: number;
        status: import(".prisma/client").$Enums.Status;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        gender: import(".prisma/client").$Enums.Gender | null;
        phone: string | null;
        deletedAt: Date | null;
        nis: string;
        birthDate: Date | null;
        address: string | null;
        classId: number;
    };
}>;
export declare function createTestMaterial(): Promise<{
    module: {
        description: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        teacherId: number;
        classId: number | null;
        subjectId: number;
        title: string;
        isPublished: boolean;
        order: number;
        academicYearId: number;
    };
    session: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        isPublished: boolean;
        moduleId: number;
        sessionNumber: number;
        isRepeatable: boolean;
    };
    material: {
        id: number;
        type: import(".prisma/client").$Enums.MaterialType;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        fileUrl: string;
        order: number;
        sessionId: number;
    };
}>;
export declare function cleanupTestData(): Promise<void>;
//# sourceMappingURL=setup.d.ts.map