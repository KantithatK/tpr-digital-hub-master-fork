-- Migration: create time_entries table with validation triggers
-- Date: 2025-12-09

-- 0) Ensure extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create table
CREATE TABLE IF NOT EXISTS public.tpr_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  phase_id bigint,
  task_id bigint,
  entry_date date NOT NULL,
  hours numeric(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  is_ot boolean NOT NULL DEFAULT false,
  ot_reason text,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_tpr_time_entries_user_entry_date ON public.tpr_time_entries (user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_tpr_time_entries_project_id ON public.tpr_time_entries (project_id);
CREATE INDEX IF NOT EXISTS idx_tpr_time_entries_task_id ON public.tpr_time_entries (task_id);
CREATE INDEX IF NOT EXISTS idx_tpr_time_entries_phase_id ON public.tpr_time_entries (phase_id);

-- 3) Trigger function to auto-update updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_time_entries_set_updated_at ON public.tpr_time_entries;
CREATE TRIGGER trg_time_entries_set_updated_at
BEFORE UPDATE ON public.tpr_time_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_updated_at();


-- 4) Validation function to enforce daily total hours and OT rules
CREATE OR REPLACE FUNCTION public.trg_validate_time_entry_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_total numeric := 0;
  total_with_new numeric := 0;
BEGIN
  -- Ensure NEW.hours is not null and within row-level bounds
  IF NEW.hours IS NULL THEN
    RAISE EXCEPTION 'hours must not be null';
  END IF;
  IF NEW.hours < 0 OR NEW.hours > 24 THEN
    RAISE EXCEPTION 'hours must be between 0 and 24';
  END IF;

  -- Sum existing hours for this user and date, excluding the row being inserted/updated
  SELECT COALESCE(SUM(hours), 0)::numeric INTO existing_total
  FROM public.tpr_time_entries
  WHERE user_id = NEW.user_id
    AND entry_date = NEW.entry_date
    AND (id IS DISTINCT FROM NEW.id);

  total_with_new := existing_total + NEW.hours;

  -- Hard limit per-day
  IF total_with_new > 24 THEN
    RAISE EXCEPTION 'ผลรวมชั่วโมงต่อวันห้ามเกิน 24 ชั่วโมง (ปัจจุบัน: %)', total_with_new;
  END IF;

  -- OT flags and validations
  IF total_with_new > 12 AND total_with_new < 24 THEN
    -- require ot_reason not null/empty
    NEW.is_ot := true;
    IF NEW.ot_reason IS NULL OR trim(NEW.ot_reason) = '' THEN
      RAISE EXCEPTION 'ต้องระบุเหตุผลเมื่อบันทึกชั่วโมงเกิน 12 ชั่วโมงต่อวัน';
    END IF;
  ELSIF total_with_new > 8 AND total_with_new <= 12 THEN
    NEW.is_ot := true;
    -- ot_reason optional in this range
  ELSE
    -- total_with_new <= 8
    NEW.is_ot := false;
    -- preserve ot_reason if present (do not clear automatically)
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to validate before insert or update
DROP TRIGGER IF EXISTS trg_time_entries_validate_hours ON public.tpr_time_entries;
CREATE TRIGGER trg_time_entries_validate_hours
BEFORE INSERT OR UPDATE ON public.tpr_time_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_validate_time_entry_hours();

-- 5) Foreign key constraints linking to projects / phases / tasks
ALTER TABLE IF EXISTS public.tpr_time_entries
  ADD CONSTRAINT fk_time_entries_project FOREIGN KEY (project_id) REFERENCES public.tpr_projects (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_time_entries_phase FOREIGN KEY (phase_id) REFERENCES public.tpr_project_wbs_phases (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_time_entries_task FOREIGN KEY (task_id) REFERENCES public.tpr_project_wbs_tasks (id) ON DELETE SET NULL;

-- End of migration
