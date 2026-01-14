-- SQL: 20251202_create_tpr_project_automation_settings_table.sql
-- Purpose: Store per-project Automation preset toggle states

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Main settings table
CREATE TABLE IF NOT EXISTS tpr_project_automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  rule_key varchar(64) NOT NULL,           -- e.g. DONE_MOVE, DUE_BEFORE_1D, OVERDUE_NOTIFY
  enabled boolean NOT NULL DEFAULT false,
  config jsonb,                            -- optional future params for a rule

  -- audit
  created_by varchar(200),
  created_at timestamptz DEFAULT now(),
  updated_by varchar(200),
  updated_at timestamptz DEFAULT now()
);

-- FK to projects (if table exists in this schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_projects') THEN
    ALTER TABLE tpr_project_automation_settings
      ADD CONSTRAINT fk_tpr_project_automation_settings_project
      FOREIGN KEY (project_id) REFERENCES tpr_projects(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

-- Unique constraint per project + rule
CREATE UNIQUE INDEX IF NOT EXISTS uq_tpr_project_automation_settings_project_rule
  ON tpr_project_automation_settings (project_id, rule_key);

-- Helpful index for lookups by project
CREATE INDEX IF NOT EXISTS idx_tpr_project_automation_settings_project
  ON tpr_project_automation_settings (project_id);

-- Reuse generic timestamp trigger if present
-- The function trg_set_timestamp was created in an earlier migration for tpr_projects
DROP TRIGGER IF EXISTS set_timestamp_tpr_project_automation_settings ON tpr_project_automation_settings;
CREATE TRIGGER set_timestamp_tpr_project_automation_settings
BEFORE UPDATE ON tpr_project_automation_settings
FOR EACH ROW
EXECUTE FUNCTION trg_set_timestamp();

-- Done.
