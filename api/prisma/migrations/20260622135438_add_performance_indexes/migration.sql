-- CreateIndex
CREATE INDEX "announcements_is_published_idx" ON "announcements"("is_published");

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

-- CreateIndex
CREATE INDEX "atp_teacher_id_idx" ON "atp"("teacher_id");

-- CreateIndex
CREATE INDEX "atp_status_idx" ON "atp"("status");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- CreateIndex
CREATE INDEX "consultations_sender_id_idx" ON "consultations"("sender_id");

-- CreateIndex
CREATE INDEX "consultations_receiver_id_idx" ON "consultations"("receiver_id");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- CreateIndex
CREATE INDEX "grades_date_idx" ON "grades"("date");

-- CreateIndex
CREATE INDEX "grades_type_idx" ON "grades"("type");

-- CreateIndex
CREATE INDEX "learning_modules_teacher_id_idx" ON "learning_modules"("teacher_id");

-- CreateIndex
CREATE INDEX "learning_modules_is_published_idx" ON "learning_modules"("is_published");

-- CreateIndex
CREATE INDEX "schedules_day_idx" ON "schedules"("day");

-- CreateIndex
CREATE INDEX "students_class_id_idx" ON "students"("class_id");

-- CreateIndex
CREATE INDEX "students_name_idx" ON "students"("name");

-- CreateIndex
CREATE INDEX "subjects_teacher_id_idx" ON "subjects"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_attendances_date_idx" ON "teacher_attendances"("date");

-- CreateIndex
CREATE INDEX "teachers_status_idx" ON "teachers"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
