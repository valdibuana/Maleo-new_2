-- CreateEnum
CREATE TYPE "TeacherAttendStatus" AS ENUM ('hadir', 'terlambat', 'izin', 'sakit', 'alpa');

-- CreateEnum
CREATE TYPE "CheckinType" AS ENUM ('self', 'admin_override');

-- CreateTable
CREATE TABLE "teacher_attendances" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "TeacherAttendStatus" NOT NULL,
    "checkin_at" TIMESTAMP(3),
    "checkin_type" "CheckinType" NOT NULL DEFAULT 'self',
    "note" TEXT,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "late_minutes" INTEGER,
    "overridden_by" INTEGER,
    "overridden_at" TIMESTAMP(3),
    "override_reason" TEXT,

    CONSTRAINT "teacher_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendances_teacher_id_date_key" ON "teacher_attendances"("teacher_id", "date");

-- AddForeignKey
ALTER TABLE "teacher_attendances" ADD CONSTRAINT "teacher_attendances_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
