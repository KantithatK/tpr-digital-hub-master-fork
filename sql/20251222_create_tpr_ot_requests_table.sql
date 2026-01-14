-- Create/adjust tpr_ot_requests table to support both legacy and new component column names
-- This table stores OT requests and includes sync triggers so frontend can use either schema

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tpr_ot_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- legacy columns
  user_id uuid,
  work_date date,
  requested_minutes integer NOT NULL DEFAULT 0,
  reason text NULL,
  -- new / friendly columns used by UI
  employee_id uuid,
  request_date date,
  ot_start_time time,
  ot_end_time time,
  hours numeric(6,2) DEFAULT 0,
  type text,
  project_id uuid,
  note text,
  special_reason text,
  attachment_url text,
  -- workflow
  status text NOT NULL DEFAULT 'Draft',
  submitted_at timestamptz NULL,
  submitted_by uuid NULL,
  approved_at timestamptz NULL,
  approved_by uuid NULL,
  rejected_at timestamptz NULL,
  rejected_by uuid NULL,
  rejected_reason text NULL,
  canceled_at timestamptz NULL,
  canceled_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tpr_ot_requests_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_ot_requests_user_date ON public.tpr_ot_requests USING btree (user_id, work_date) TABLESPACE pg_default;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ot_requests_employee_date ON public.tpr_ot_requests USING btree (employee_id, request_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ot_requests_user_date ON public.tpr_ot_requests USING btree (user_id, work_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ot_requests_employee_date ON public.tpr_ot_requests USING btree (employee_id, request_date) TABLESPACE pg_default;

-- foreign keys
ALTER TABLE public.tpr_ot_requests
  ADD CONSTRAINT tpr_ot_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES employees (id) ON DELETE CASCADE;

ALTER TABLE public.tpr_ot_requests
  ADD CONSTRAINT tpr_ot_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;

-- optional project FK if projects table exists (silently ignore if missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    BEGIN
      ALTER TABLE public.tpr_ot_requests ADD CONSTRAINT tpr_ot_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      -- already exists
    END;
  END IF;
END$$;

-- trigger to keep legacy and new columns in sync (user_id <-> employee_id, work_date <-> request_date, requested_minutes <-> hours)
CREATE OR REPLACE FUNCTION trg_sync_ot_requests_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- sync user/employee id
  IF NEW.user_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    NEW.user_id := NEW.employee_id;
  ELSIF NEW.employee_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.employee_id := NEW.user_id;
  END IF;

  -- sync dates
  IF NEW.work_date IS NULL AND NEW.request_date IS NOT NULL THEN
    NEW.work_date := NEW.request_date;
  ELSIF NEW.request_date IS NULL AND NEW.work_date IS NOT NULL THEN
    NEW.request_date := NEW.work_date;
  END IF;

  -- sync minutes <> hours
  IF (NEW.requested_minutes IS NULL OR NEW.requested_minutes = 0) AND NEW.hours IS NOT NULL THEN
    NEW.requested_minutes := round(NEW.hours * 60)::integer;
  ELSIF NEW.hours IS NULL AND NEW.requested_minutes IS NOT NULL THEN
    NEW.hours := round((NEW.requested_minutes::numeric / 60)::numeric, 2);
  END IF;

  RETURN NEW;
END;
$$;

-- attach sync trigger
DROP TRIGGER IF EXISTS trg_ot_requests_sync ON public.tpr_ot_requests;
CREATE TRIGGER trg_ot_requests_sync
BEFORE INSERT OR UPDATE ON public.tpr_ot_requests
FOR EACH ROW
EXECUTE FUNCTION trg_sync_ot_requests_columns();

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_ot_requests_updated_at ON public.tpr_ot_requests;
CREATE TRIGGER trg_ot_requests_updated_at
BEFORE UPDATE ON public.tpr_ot_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- keep schema tidy: ensure required unique index exists (also keep legacy idx)
CREATE INDEX IF NOT EXISTS idx_tpr_ot_requests_status ON public.tpr_ot_requests USING btree (status) TABLESPACE pg_default;

COMMENT ON TABLE public.tpr_ot_requests IS 'OT requests table, compatible with both legacy (user_id/work_date/requested_minutes) and new UI (employee_id/request_date/hours, ot_start_time, ot_end_time).';
