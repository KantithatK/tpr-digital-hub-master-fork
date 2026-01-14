-- Migration: add start_date and end_date to tpr_project_subtasks
-- Date: 2025-12-01

-- 1) Add nullable columns to allow a safe deploy
alter table if exists public.tpr_project_wbs_tasks
  add column if not exists start_date date,
  add column if not exists end_date date;

-- 2) Backfill existing rows using the parent phase dates (when available)
update public.tpr_project_wbs_tasks s
set
  start_date = p.start_date,
  end_date   = p.end_date
from public.tpr_project_wbs_phases p
where s.phase_id = p.id
  and (s.start_date is null or s.end_date is null);

-- 3) Add a check constraint to ensure subtask dates (when present)
--    lie within the parent phase range and start <= end.
--    This uses a safe OR so nulls are still allowed.
-- Remove any existing check constraint (can't use subqueries in check constraints)
ALTER TABLE IF EXISTS public.tpr_project_wbs_tasks
  DROP CONSTRAINT IF EXISTS chk_wbs_task_dates_within_phase;

-- Create a trigger function to validate task dates against the parent phase
CREATE OR REPLACE FUNCTION public.fn_chk_wbs_task_dates_within_phase()
RETURNS trigger AS $$
DECLARE
  p_start date;
  p_end date;
BEGIN
  -- allow nulls (partial dates allowed) — only validate when both task dates provided
  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT start_date, end_date INTO p_start, p_end
  FROM public.tpr_project_wbs_phases WHERE id = NEW.phase_id;

  -- If parent phase missing or dates missing, raise a helpful error
  IF p_start IS NULL OR p_end IS NULL THEN
    RAISE EXCEPTION 'Parent phase dates are missing for phase_id %', NEW.phase_id;
  END IF;

  IF NEW.start_date < p_start THEN
    RAISE EXCEPTION 'วันที่เริ่มงานย่อยต้องไม่ก่อนวันที่เริ่มของเฟส';
  ELSIF NEW.end_date > p_end THEN
    RAISE EXCEPTION 'วันที่สิ้นสุดงานย่อยต้องไม่เกินวันที่สิ้นสุดของเฟส';
  ELSIF NEW.start_date > NEW.end_date THEN
    RAISE EXCEPTION 'วันที่เริ่มงานย่อยต้องไม่หลังวันที่สิ้นสุด';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to enforce validation on insert/update
DROP TRIGGER IF EXISTS trg_chk_wbs_task_dates_within_phase ON public.tpr_project_wbs_tasks;
CREATE TRIGGER trg_chk_wbs_task_dates_within_phase
  BEFORE INSERT OR UPDATE ON public.tpr_project_wbs_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_chk_wbs_task_dates_within_phase();

-- Note:
-- - If your application requires subtask dates to be NOT NULL, add a follow-up
--   migration after you are confident the data has been backfilled and
--   application code updated.
-- - Adjust table/schema names if your DB uses a different schema.
