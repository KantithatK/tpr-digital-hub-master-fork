-- Migration: create tpr_project_wbs_tasks with start_date/end_date and trigger validation
-- Adds table, indexes and a trigger function that ensures task dates lie within their phase bounds

CREATE TABLE IF NOT EXISTS public.tpr_project_wbs_tasks (
  id bigserial NOT NULL,
  project_id uuid NOT NULL,
  phase_id bigint NOT NULL,
  code character varying(100) NOT NULL,
  name text NOT NULL,
  planned_hours integer NULL DEFAULT 0,
  owner text NULL,
  metadata jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  workstream_id uuid NULL,
  workstream_code character varying(100) NULL,
  start_date date NULL,
  end_date date NULL,
  CONSTRAINT tpr_project_wbs_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT fk_wbs_tasks_phase FOREIGN KEY (phase_id) REFERENCES public.tpr_project_wbs_phases (id) ON DELETE CASCADE,
  CONSTRAINT fk_wbs_tasks_project FOREIGN KEY (project_id) REFERENCES public.tpr_projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_wbs_tasks_workstream FOREIGN KEY (workstream_id) REFERENCES public.tpr_workstreams (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_wbs_tasks_project_phase_code ON public.tpr_project_wbs_tasks USING btree (project_id, phase_id, code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_id ON public.tpr_project_wbs_tasks USING btree (phase_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_project_id ON public.tpr_project_wbs_tasks USING btree (project_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_workstream_id ON public.tpr_project_wbs_tasks USING btree (workstream_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_workstream_code ON public.tpr_project_wbs_tasks USING btree (workstream_code) TABLESPACE pg_default;

-- Trigger function to validate task dates against parent phase dates
CREATE OR REPLACE FUNCTION public.fn_chk_wbs_task_dates_within_phase()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_start date;
  p_end date;
BEGIN
  -- If both task dates are null, nothing to validate
  IF NEW.start_date IS NULL AND NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Load phase bounds (if any)
  SELECT start_date, end_date INTO p_start, p_end FROM public.tpr_project_wbs_phases WHERE id = NEW.phase_id;

  -- If phase not found or phase bounds missing, only enforce start <= end when both provided
  IF NOT FOUND OR p_start IS NULL OR p_end IS NULL THEN
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.start_date > NEW.end_date THEN
      RAISE EXCEPTION 'วันที่เริ่มงานย่อยต้องไม่หลังวันที่สิ้นสุด';
    END IF;
    RETURN NEW;
  END IF;

  -- Require both dates when phase has bounds
  IF NEW.start_date IS NULL THEN
    RAISE EXCEPTION 'กรุณาระบุวันที่เริ่มงานย่อย';
  END IF;
  IF NEW.end_date IS NULL THEN
    RAISE EXCEPTION 'กรุณาระบุวันที่สิ้นสุดงานย่อย';
  END IF;

  -- Enforce within phase bounds
  IF NEW.start_date < p_start THEN
    RAISE EXCEPTION 'วันที่เริ่มงานย่อยต้องไม่ก่อนวันที่เริ่มของเฟส';
  END IF;
  IF NEW.end_date > p_end THEN
    RAISE EXCEPTION 'วันที่สิ้นสุดงานย่อยต้องไม่เกินวันที่สิ้นสุดของเฟส';
  END IF;
  IF NEW.start_date > NEW.end_date THEN
    RAISE EXCEPTION 'วันที่เริ่มงานย่อยต้องไม่หลังวันที่สิ้นสุด';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to table
DROP TRIGGER IF EXISTS trg_chk_wbs_task_dates_within_phase ON public.tpr_project_wbs_tasks;
CREATE TRIGGER trg_chk_wbs_task_dates_within_phase
  BEFORE INSERT OR UPDATE ON public.tpr_project_wbs_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_chk_wbs_task_dates_within_phase();

-- End of migration
