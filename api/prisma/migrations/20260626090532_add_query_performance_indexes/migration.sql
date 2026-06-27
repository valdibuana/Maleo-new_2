-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "announcements_is_published_target_created_at_idx" ON "announcements"("is_published", "target", "created_at");

-- CreateIndex
CREATE INDEX "students_deleted_at_name_idx" ON "students"("deleted_at", "name");

-- CreateIndex
CREATE INDEX "students_deleted_at_class_id_idx" ON "students"("deleted_at", "class_id");

-- CreateIndex
CREATE INDEX "teachers_name_idx" ON "teachers"("name");

-- CreateIndex
CREATE INDEX "teachers_status_deleted_at_idx" ON "teachers"("status", "deleted_at");
