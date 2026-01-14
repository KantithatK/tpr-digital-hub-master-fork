BEGIN;

-- Add billable_mode column with default 'billable' if it does not already exist
ALTER TABLE IF EXISTS tpr_project_wbs_tasks
  ADD COLUMN IF NOT EXISTS billable_mode text DEFAULT 'billable';

-- Ensure existing rows have a value
UPDATE tpr_project_wbs_tasks
SET billable_mode = 'billable'
WHERE billable_mode IS NULL;

-- Add a CHECK constraint to restrict allowed values (safely only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tpr_project_wbs_tasks_billable_mode_check'
  ) THEN
    ALTER TABLE tpr_project_wbs_tasks
      ADD CONSTRAINT tpr_project_wbs_tasks_billable_mode_check
      CHECK (billable_mode IN ('billable','non_billable','manual'));
  END IF;
END$$;

COMMIT;
