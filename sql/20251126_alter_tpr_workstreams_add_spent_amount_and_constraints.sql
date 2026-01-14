-- SQL: 20251126_alter_tpr_workstreams_add_spent_amount_and_constraints.sql
-- Purpose: Align tpr_workstreams table with application fields and add integrity constraints.
-- Adds: spent_amount column, unique constraint on (project_id, code), FK constraints, Thai status default.

-- Ensure extension for UUID generation (already added earlier, harmless if repeats)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add spent_amount column if missing
ALTER TABLE tpr_workstreams
  ADD COLUMN IF NOT EXISTS spent_amount numeric(18,2) DEFAULT 0;

-- Adjust default status to Thai initial value if column exists and default differs
ALTER TABLE tpr_workstreams
  ALTER COLUMN status SET DEFAULT 'ยังไม่เริ่ม';

-- Optional: constrain status values (comment out if you prefer free text)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tpr_workstreams_status') THEN
    ALTER TABLE tpr_workstreams
      ADD CONSTRAINT chk_tpr_workstreams_status CHECK (status IN ('ยังไม่เริ่ม','ทำอยู่','เสี่ยง','ล่าช้า','เสร็จแล้ว','Planning'));
  END IF;
END$$;

-- Unique code per project (avoid duplicates). Uses DEFERRABLE so bulk loads can reorder.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tpr_workstreams_project_code') THEN
    ALTER TABLE tpr_workstreams
      ADD CONSTRAINT uq_tpr_workstreams_project_code UNIQUE (project_id, code) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END$$;

-- Foreign keys (only create if referenced tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_projects') THEN
    BEGIN
      ALTER TABLE tpr_workstreams
        ADD CONSTRAINT fk_tpr_workstreams_project FOREIGN KEY (project_id) REFERENCES tpr_projects(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'employees') THEN
    BEGIN
      ALTER TABLE tpr_workstreams
        ADD CONSTRAINT fk_tpr_workstreams_owner FOREIGN KEY (owner) REFERENCES employees(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- Timestamp trigger function (reuse if already defined)
CREATE OR REPLACE FUNCTION trg_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to keep updated_at current
DROP TRIGGER IF EXISTS set_timestamp_tpr_workstreams ON tpr_workstreams;
CREATE TRIGGER set_timestamp_tpr_workstreams
BEFORE UPDATE ON tpr_workstreams
FOR EACH ROW
EXECUTE FUNCTION trg_set_timestamp();

-- Indexes (project_id & code already existed; add index for status if useful)
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_status ON tpr_workstreams(status);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_owner ON tpr_workstreams(owner);

-- Done.
