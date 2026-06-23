-- AlterTable
ALTER TABLE "students" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "deleted_at" TIMESTAMP(3);
