-- AlterTable
ALTER TABLE "students" ADD COLUMN "nisn" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "students_nisn_key" ON "students"("nisn");
