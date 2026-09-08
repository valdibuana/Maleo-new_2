-- CreateTable
CREATE TABLE "teacher_journals" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "material_taught" TEXT NOT NULL,
    "learning_objective" TEXT NOT NULL,
    "activity_notes" TEXT,
    "learning_constraints" TEXT,
    "follow_up" TEXT,
    "teacher_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_journals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_journals_teacher_id_date_idx" ON "teacher_journals"("teacher_id", "date");

-- AddForeignKey
ALTER TABLE "teacher_journals" ADD CONSTRAINT "teacher_journals_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_journals" ADD CONSTRAINT "teacher_journals_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_journals" ADD CONSTRAINT "teacher_journals_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
