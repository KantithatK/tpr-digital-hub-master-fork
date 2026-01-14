-- Migration: Add parent_project_id to tpr_projects (self-referencing FK)
-- Date: 2025-11-19

BEGIN;

-- 1) Ensure column exists and has the correct type (uuid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tpr_projects'
      AND column_name = 'parent_project_id'
  ) THEN
    ALTER TABLE public.tpr_projects
      ADD COLUMN parent_project_id uuid NULL;

  ELSE
    -- If the column exists but isn't uuid, change it to uuid
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tpr_projects'
        AND column_name = 'parent_project_id'
        AND data_type <> 'uuid'
    ) THEN
      -- Drop old FK if any (in case previous attempts created something)
      ALTER TABLE public.tpr_projects
        DROP CONSTRAINT IF EXISTS fk_tpr_projects_parent_project_id;

      -- Safest cast: set to NULL (adjust here if you have a real mapping)
      ALTER TABLE public.tpr_projects
        ALTER COLUMN parent_project_id TYPE uuid USING NULL;
    END IF;
  END IF;
END$$;

-- 2) Create index for lookups by parent
CREATE INDEX IF NOT EXISTS idx_tpr_projects_parent_project_id
  ON public.tpr_projects(parent_project_id);

-- 3) Add FK (self-reference) if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tpr_projects_parent_project_id'
      AND conrelid = 'public.tpr_projects'::regclass
  ) THEN
    ALTER TABLE public.tpr_projects
      ADD CONSTRAINT fk_tpr_projects_parent_project_id
      FOREIGN KEY (parent_project_id)
      REFERENCES public.tpr_projects(id)
      ON DELETE SET NULL
      NOT VALID;  -- avoid immediate full-table validation/lock

    ALTER TABLE public.tpr_projects
      VALIDATE CONSTRAINT fk_tpr_projects_parent_project_id;
  END IF;
END$$;

COMMIT;

-- Down (rollback)
-- BEGIN;
-- ALTER TABLE IF EXISTS public.tpr_projects DROP CONSTRAINT IF EXISTS fk_tpr_projects_parent_project_id;
-- DROP INDEX IF EXISTS public.idx_tpr_projects_parent_project_id;
-- ALTER TABLE IF EXISTS public.tpr_projects DROP COLUMN IF EXISTS parent_project_id;
-- COMMIT;
