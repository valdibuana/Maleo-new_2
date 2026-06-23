-- RenameRPS to ATP Migration
-- This migration safely renames all RPS-related tables and enums to ATP
-- Data is preserved (ALTER TABLE RENAME, not DROP + CREATE)

-- ============================================================
-- 1. RENAME ENUM VALUES (PostgreSQL requires ALTER TYPE ... RENAME VALUE)
-- ============================================================

-- RPSStatus → ATPStatus (enum name)
ALTER TYPE "RPSStatus" RENAME TO "ATPStatus";

-- MaterialTypeRPS → MaterialTypeATP (enum name)
ALTER TYPE "MaterialTypeRPS" RENAME TO "MaterialTypeATP";

-- ============================================================
-- 2. RENAME TABLES
-- ============================================================

-- rps → atp
ALTER TABLE "rps" RENAME TO "atp";

-- rps_meetings → atp_meetings
ALTER TABLE "rps_meetings" RENAME TO "atp_meetings";

-- rps_materials → atp_materials
ALTER TABLE "rps_materials" RENAME TO "atp_materials";

-- rps_material_access → atp_material_access
ALTER TABLE "rps_material_access" RENAME TO "atp_material_access";

-- ============================================================
-- 3. RENAME COLUMNS (rps_id → atp_id in atp_meetings)
-- ============================================================

ALTER TABLE "atp_meetings" RENAME COLUMN "rps_id" TO "atp_id";

-- ============================================================
-- 4. RENAME SEQUENCES (auto-generated primary key sequences)
-- ============================================================

ALTER SEQUENCE IF EXISTS "rps_id_seq" RENAME TO "atp_id_seq";
ALTER SEQUENCE IF EXISTS "rps_meetings_id_seq" RENAME TO "atp_meetings_id_seq";
ALTER SEQUENCE IF EXISTS "rps_materials_id_seq" RENAME TO "atp_materials_id_seq";
ALTER SEQUENCE IF EXISTS "rps_material_access_id_seq" RENAME TO "atp_material_access_id_seq";

-- ============================================================
-- 5. RENAME CONSTRAINTS & INDEXES (best-effort, non-breaking if not exist)
-- ============================================================

-- Primary keys
ALTER INDEX IF EXISTS "rps_pkey" RENAME TO "atp_pkey";
ALTER INDEX IF EXISTS "rps_meetings_pkey" RENAME TO "atp_meetings_pkey";
ALTER INDEX IF EXISTS "rps_materials_pkey" RENAME TO "atp_materials_pkey";
ALTER INDEX IF EXISTS "rps_material_access_pkey" RENAME TO "atp_material_access_pkey";

-- Unique constraints / indexes
ALTER INDEX IF EXISTS "rps_nomor_induk_1_key" RENAME TO "atp_nomor_induk_1_key";
ALTER INDEX IF EXISTS "rps_nomor_induk_2_key" RENAME TO "atp_nomor_induk_2_key";
ALTER INDEX IF EXISTS "rps_nomor_induk_3_key" RENAME TO "atp_nomor_induk_3_key";
ALTER INDEX IF EXISTS "rps_subject_id_class_id_teacher_id_academic_year_id_key" RENAME TO "atp_subject_id_class_id_teacher_id_academic_year_id_key";
ALTER INDEX IF EXISTS "rps_meetings_rps_id_meeting_number_key" RENAME TO "atp_meetings_atp_id_meeting_number_key";
ALTER INDEX IF EXISTS "rps_material_access_student_id_material_id_key" RENAME TO "atp_material_access_student_id_material_id_key";
