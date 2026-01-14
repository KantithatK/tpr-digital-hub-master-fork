-- Migration: 20251121_create_project_wbs_tables.sql
-- Purpose: Create WBS tables used by ProjectWbs component
-- Notes: run this in your Supabase/Postgres database (psql or Supabase SQL editor)

BEGIN;

-- Table: tpr_project_wbs_phases
CREATE TABLE IF NOT EXISTS public.tpr_project_wbs_phases (
  id bigserial PRIMARY KEY,
  project_id uuid NOT NULL,
  code varchar(100) NOT NULL,
  name text NOT NULL,
  planned_hours integer DEFAULT 0,
  fee numeric(14,2) DEFAULT 0.00,
  owner text,
  start_date date,
  end_date date,
  status varchar(50) DEFAULT 'Planning',
  note text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add FK to projects table if it exists (adjust table/name if different)
-- If your projects table uses a different name, edit the reference accordingly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_projects') THEN
    ALTER TABLE public.tpr_project_wbs_phases
      ADD CONSTRAINT fk_wbs_phases_project
      FOREIGN KEY (project_id) REFERENCES public.tpr_projects(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- constraint already exists; ignore
  NULL;
END$$;

-- Ensure unique phase code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_wbs_phases_project_code ON public.tpr_project_wbs_phases(project_id, code);
CREATE INDEX IF NOT EXISTS idx_wbs_phases_project_id ON public.tpr_project_wbs_phases(project_id);

-- Table: tpr_project_wbs_tasks
CREATE TABLE IF NOT EXISTS public.tpr_project_wbs_tasks (
  id bigserial PRIMARY KEY,
  project_id uuid NOT NULL,
  phase_id bigint NOT NULL,
  code varchar(100) NOT NULL,
  name text NOT NULL,
  planned_hours integer DEFAULT 0,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add FK to phases and (optionally) projects, ignore if tables missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_project_wbs_phases') THEN
    ALTER TABLE public.tpr_project_wbs_tasks
      ADD CONSTRAINT fk_wbs_tasks_phase
      FOREIGN KEY (phase_id) REFERENCES public.tpr_project_wbs_phases(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_projects') THEN
    ALTER TABLE public.tpr_project_wbs_tasks
      ADD CONSTRAINT fk_wbs_tasks_project
      FOREIGN KEY (project_id) REFERENCES public.tpr_projects(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

-- Ensure unique task code per project+phase
CREATE UNIQUE INDEX IF NOT EXISTS idx_wbs_tasks_project_phase_code ON public.tpr_project_wbs_tasks(project_id, phase_id, code);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_id ON public.tpr_project_wbs_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_project_id ON public.tpr_project_wbs_tasks(project_id);

COMMIT;

-- Usage:
-- psql "postgresql://<user>:<pass>@<host>:<port>/<db>" -f 20251121_create_project_wbs_tables.sql
-- Or paste into Supabase SQL editor and run.
