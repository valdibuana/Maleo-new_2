/*
  Warnings:

  - You are about to drop the column `group` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `homeroom_teacher_id` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `grades` table. All the data in the column will be lost.
  - You are about to drop the column `grade_id` on the `schedules` table. All the data in the column will be lost.
  - You are about to drop the column `grade_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `guardian_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `scores` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_score` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `grades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `class_id` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `class_id` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_homeroom_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_grade_id_fkey";

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_student_id_fkey";

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_grade_id_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_guardian_id_fkey";

-- DropIndex
DROP INDEX "grades_name_key";

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "group",
DROP COLUMN "homeroom_teacher_id",
DROP COLUMN "level",
DROP COLUMN "name",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "max_score" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "score" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "student_id" INTEGER NOT NULL,
ADD COLUMN     "subject_id" INTEGER NOT NULL,
ADD COLUMN     "type" "ScoreType" NOT NULL;

-- AlterTable
ALTER TABLE "schedules" DROP COLUMN "grade_id",
ADD COLUMN     "class_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "grade_id",
DROP COLUMN "guardian_id",
ADD COLUMN     "class_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "scores";

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "group" TEXT NOT NULL,
    "homeroom_teacher_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudentGuardians" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "classes_name_key" ON "classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_StudentGuardians_AB_unique" ON "_StudentGuardians"("A", "B");

-- CreateIndex
CREATE INDEX "_StudentGuardians_B_index" ON "_StudentGuardians"("B");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_homeroom_teacher_id_fkey" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentGuardians" ADD CONSTRAINT "_StudentGuardians_A_fkey" FOREIGN KEY ("A") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentGuardians" ADD CONSTRAINT "_StudentGuardians_B_fkey" FOREIGN KEY ("B") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
