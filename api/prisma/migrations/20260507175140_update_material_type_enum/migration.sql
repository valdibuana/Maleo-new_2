-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaterialType" ADD VALUE 'pptx';
ALTER TYPE "MaterialType" ADD VALUE 'doc';
ALTER TYPE "MaterialType" ADD VALUE 'docx';
ALTER TYPE "MaterialType" ADD VALUE 'image';
ALTER TYPE "MaterialType" ADD VALUE 'link';
