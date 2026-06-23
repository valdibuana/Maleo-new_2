-- CreateEnum
CREATE TYPE "PathType" AS ENUM ('AKADEMIK', 'VOKASI');

-- CreateTable
CREATE TABLE "student_classifications" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "path_type" "PathType" NOT NULL,
    "top_interest" TEXT NOT NULL,
    "analysis_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_classifications_student_id_academic_year_id_semeste_key" ON "student_classifications"("student_id", "academic_year_id", "semester");

-- AddForeignKey
ALTER TABLE "student_classifications" ADD CONSTRAINT "student_classifications_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classifications" ADD CONSTRAINT "student_classifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
