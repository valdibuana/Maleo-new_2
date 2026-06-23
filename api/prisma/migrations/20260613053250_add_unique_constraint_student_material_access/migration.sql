/*
  Warnings:

  - A unique constraint covering the columns `[student_id,material_id]` on the table `student_material_access` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" SERIAL NOT NULL,
    "class_level" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "jp_label" TEXT NOT NULL,
    "slot_type" TEXT NOT NULL DEFAULT 'academic',
    "subject_name" TEXT,
    "teacher_name" TEXT,
    "teacher_id" INTEGER,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_deadline" TIMESTAMP(3),
    "academic_year_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_slots_academic_year_id_class_level_day_time_slot_key" ON "schedule_slots"("academic_year_id", "class_level", "day", "time_slot");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_slots_academic_year_id_teacher_id_day_time_slot_key" ON "schedule_slots"("academic_year_id", "teacher_id", "day", "time_slot");

-- CreateIndex
CREATE UNIQUE INDEX "student_material_access_student_id_material_id_key" ON "student_material_access"("student_id", "material_id");

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
