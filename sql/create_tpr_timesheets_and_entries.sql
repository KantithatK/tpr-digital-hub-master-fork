-- Create tpr_timesheets and tpr_timesheet_entries tables for Timesheet feature
-- File: sql/create_tpr_timesheets_and_entries.sql
-- Generated: 2025-12-04

-- Table: tpr_timesheets (header / weekly timesheet)
CREATE TABLE IF NOT EXISTS public.tpr_timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  week_start_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_hours numeric(7,2) DEFAULT 0,
  total_billable_hours numeric(7,2) DEFAULT 0,

  -- workflow fields
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  rejected_reason text,
  remarks text,

  -- audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT tpr_timesheets_status_check CHECK (status IN ('draft','submitted','approved','rejected'))
);

-- Unique index: one timesheet per employee per week_start_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_tpr_timesheets_employee_week
  ON public.tpr_timesheets (employee_id, week_start_date);

-- Optional: consider an index on (week_start_date) if you query by week across employees
CREATE INDEX IF NOT EXISTS idx_tpr_timesheets_week_start_date
  ON public.tpr_timesheets (week_start_date);


-- Table: tpr_timesheet_entries (line items)
CREATE TABLE IF NOT EXISTS public.tpr_timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.tpr_timesheets(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.tpr_projects(id) ON DELETE RESTRICT,
  -- wbs_phase_id and task_id use bigint to match existing WBS tables (bigserial ids)
  wbs_phase_id bigint NULL REFERENCES public.tpr_project_wbs_phases(id) ON DELETE SET NULL,
  task_id bigint NULL REFERENCES public.tpr_project_wbs_tasks(id) ON DELETE SET NULL,

  -- date and hours
  work_date date NOT NULL,
  hours numeric(7,2) NOT NULL CHECK (hours >= 0),

  -- status/type/source
  is_billable boolean NOT NULL DEFAULT true,
  entry_type text NOT NULL DEFAULT 'normal',
  source text NOT NULL DEFAULT 'manual',
  note text,

  -- audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT tpr_timesheet_entries_entry_type_check CHECK (entry_type IN ('normal','overtime','leave','holiday')),
  CONSTRAINT tpr_timesheet_entries_source_check CHECK (source IN ('manual','timer','import'))
);

-- Indexes to help lookups
CREATE INDEX IF NOT EXISTS idx_tpr_timesheet_entries_timesheet_id
  ON public.tpr_timesheet_entries USING btree (timesheet_id);

CREATE INDEX IF NOT EXISTS idx_tpr_timesheet_entries_project_work_date
  ON public.tpr_timesheet_entries USING btree (project_id, work_date);

CREATE INDEX IF NOT EXISTS idx_tpr_timesheet_entries_work_date
  ON public.tpr_timesheet_entries USING btree (work_date);

-- Optional unique constraint to prevent duplicate lines for same timesheet/project/task/date
-- Uncomment if desired:
-- ALTER TABLE public.tpr_timesheet_entries
--   ADD CONSTRAINT uq_tpr_timesheet_entry_unique_per_day UNIQUE (timesheet_id, project_id, task_id, work_date);

-- End of file
