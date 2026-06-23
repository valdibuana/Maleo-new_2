-- RenameForeignKey
ALTER TABLE "atp" RENAME CONSTRAINT "rps_academic_year_id_fkey" TO "atp_academic_year_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp" RENAME CONSTRAINT "rps_class_id_fkey" TO "atp_class_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp" RENAME CONSTRAINT "rps_subject_id_fkey" TO "atp_subject_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp" RENAME CONSTRAINT "rps_teacher_id_fkey" TO "atp_teacher_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp_material_access" RENAME CONSTRAINT "rps_material_access_material_id_fkey" TO "atp_material_access_material_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp_material_access" RENAME CONSTRAINT "rps_material_access_student_id_fkey" TO "atp_material_access_student_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp_materials" RENAME CONSTRAINT "rps_materials_meeting_id_fkey" TO "atp_materials_meeting_id_fkey";

-- RenameForeignKey
ALTER TABLE "atp_meetings" RENAME CONSTRAINT "rps_meetings_rps_id_fkey" TO "atp_meetings_atp_id_fkey";
