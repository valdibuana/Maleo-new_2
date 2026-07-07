-- Query indexes for release-readiness access patterns:
-- attendance/grade history by student, teacher/class assignment lists, and consultation threads.
CREATE INDEX "attendances_student_id_date_idx" ON "attendances"("student_id", "date");
CREATE INDEX "grades_student_id_date_idx" ON "grades"("student_id", "date");
CREATE INDEX "grades_subject_id_type_idx" ON "grades"("subject_id", "type");
CREATE INDEX "assignments_teacher_id_due_date_idx" ON "assignments"("teacher_id", "due_date");
CREATE INDEX "assignments_class_id_due_date_idx" ON "assignments"("class_id", "due_date");
CREATE INDEX "consultations_parent_id_receiver_id_idx" ON "consultations"("parent_id", "receiver_id");
