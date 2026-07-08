-- AlterTable: Add missing deleted_at columns to guardians, classes, and subjects
-- These columns exist in the Prisma schema but were missed in the original
-- soft_delete migration (20260622135850), which only added them to students and teachers.

ALTER TABLE "guardians" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "classes" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "subjects" ADD COLUMN "deleted_at" TIMESTAMP(3);
