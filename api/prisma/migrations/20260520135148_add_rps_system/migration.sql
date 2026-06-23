-- CreateEnum
CREATE TYPE "RPSStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "MaterialTypeRPS" AS ENUM ('pdf', 'ppt', 'pptx', 'docx', 'video_link', 'zip', 'image', 'link');

-- CreateTable
CREATE TABLE "rps" (
    "id" SERIAL NOT NULL,
    "nomor_induk_1" TEXT NOT NULL,
    "nomor_induk_2" TEXT NOT NULL,
    "nomor_induk_3" TEXT NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "total_meetings" INTEGER NOT NULL DEFAULT 16,
    "status" "RPSStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "learning_objective" TEXT,
    "learning_strategy" TEXT,
    "teacher_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rps_meetings" (
    "id" SERIAL NOT NULL,
    "rps_id" INTEGER NOT NULL,
    "meeting_number" INTEGER NOT NULL,
    "title" TEXT,
    "learning_path" TEXT,
    "learning_goal" TEXT,
    "activity" TEXT,
    "assessment" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rps_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rps_materials" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MaterialTypeRPS" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rps_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rps_material_access" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rps_material_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subjects" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rps_nomor_induk_1_key" ON "rps"("nomor_induk_1");

-- CreateIndex
CREATE UNIQUE INDEX "rps_nomor_induk_2_key" ON "rps"("nomor_induk_2");

-- CreateIndex
CREATE UNIQUE INDEX "rps_nomor_induk_3_key" ON "rps"("nomor_induk_3");

-- CreateIndex
CREATE UNIQUE INDEX "rps_subject_id_class_id_teacher_id_academic_year_id_key" ON "rps"("subject_id", "class_id", "teacher_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "rps_meetings_rps_id_meeting_number_key" ON "rps_meetings"("rps_id", "meeting_number");

-- CreateIndex
CREATE UNIQUE INDEX "rps_material_access_student_id_material_id_key" ON "rps_material_access"("student_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_teacher_id_subject_id_key" ON "teacher_subjects"("teacher_id", "subject_id");

-- AddForeignKey
ALTER TABLE "rps" ADD CONSTRAINT "rps_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps" ADD CONSTRAINT "rps_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps" ADD CONSTRAINT "rps_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps" ADD CONSTRAINT "rps_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps_meetings" ADD CONSTRAINT "rps_meetings_rps_id_fkey" FOREIGN KEY ("rps_id") REFERENCES "rps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps_materials" ADD CONSTRAINT "rps_materials_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "rps_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps_material_access" ADD CONSTRAINT "rps_material_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rps_material_access" ADD CONSTRAINT "rps_material_access_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "rps_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
