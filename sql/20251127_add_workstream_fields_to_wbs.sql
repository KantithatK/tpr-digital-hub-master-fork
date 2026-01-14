-- Migration: Add workstream fields to WBS phases and tasks
-- Date: 2025-11-27
-- Adds: workstream_id (FK to tpr_workstreams.id) and workstream_code (human-readable code)

BEGIN;

-- phases: add columns
ALTER TABLE public.tpr_project_wbs_phases
  ADD COLUMN IF NOT EXISTS workstream_id uuid NULL,
  ADD COLUMN IF NOT EXISTS workstream_code character varying(100) NULL;

-- add index on workstream_id and workstream_code for phases
CREATE INDEX IF NOT EXISTS idx_wbs_phases_workstream_id ON public.tpr_project_wbs_phases USING btree (workstream_id);
CREATE INDEX IF NOT EXISTS idx_wbs_phases_workstream_code ON public.tpr_project_wbs_phases USING btree (workstream_code);

-- add foreign key constraint from phases.workstream_id -> tpr_workstreams.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tpr_project_wbs_phases' AND c.conname = 'fk_wbs_phases_workstream'
  ) THEN
    ALTER TABLE public.tpr_project_wbs_phases
      ADD CONSTRAINT fk_wbs_phases_workstream FOREIGN KEY (workstream_id) REFERENCES public.tpr_workstreams (id) ON DELETE SET NULL;
  END IF;
END$$;

-- If a previous run created `workstream_id` with a different type (e.g. bigint), coerce it to uuid by setting values to NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tpr_project_wbs_phases' AND column_name = 'workstream_id' AND udt_name <> 'uuid'
  ) THEN
    ALTER TABLE public.tpr_project_wbs_phases ALTER COLUMN workstream_id TYPE uuid USING (NULL);
  END IF;
END$$;

-- tasks: add columns
ALTER TABLE public.tpr_project_wbs_tasks
  ADD COLUMN IF NOT EXISTS workstream_id uuid NULL,
  ADD COLUMN IF NOT EXISTS workstream_code character varying(100) NULL;

-- add index on workstream_id and workstream_code for tasks
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_workstream_id ON public.tpr_project_wbs_tasks USING btree (workstream_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_workstream_code ON public.tpr_project_wbs_tasks USING btree (workstream_code);

-- add foreign key constraint from tasks.workstream_id -> tpr_workstreams.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tpr_project_wbs_tasks' AND c.conname = 'fk_wbs_tasks_workstream'
  ) THEN
    ALTER TABLE public.tpr_project_wbs_tasks
      ADD CONSTRAINT fk_wbs_tasks_workstream FOREIGN KEY (workstream_id) REFERENCES public.tpr_workstreams (id) ON DELETE SET NULL;
  END IF;
END$$;

-- If a previous run created `workstream_id` with a different type (e.g. bigint), coerce it to uuid by setting values to NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tpr_project_wbs_tasks' AND column_name = 'workstream_id' AND udt_name <> 'uuid'
  ) THEN
    ALTER TABLE public.tpr_project_wbs_tasks ALTER COLUMN workstream_id TYPE uuid USING (NULL);
  END IF;
END$$;

COMMIT;

-- Notes:
-- 1) `workstream_id` is nullable and set to NULL if the referenced workstream is deleted (ON DELETE SET NULL).
-- 2) `workstream_code` is provided as a convenience/human-readable field; you can keep it in sync from the app when creating phases/tasks.
-- 3) This migration now assumes `tpr_workstreams.id` is `uuid`. If your workstreams use `bigint`, change the `workstream_id` type back to `bigint`.
-- 4) After applying, consider backfilling values for existing rows if there's a logical mapping between phases/tasks and workstreams.
