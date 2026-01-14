-- SQL: 20251202_enable_rls_and_policies_for_automation_settings.sql
-- Purpose: Enable RLS and add permissive policies for app roles

-- Enable Row Level Security
ALTER TABLE IF EXISTS tpr_project_automation_settings ENABLE ROW LEVEL SECURITY;

-- For Supabase, service_role bypasses RLS automatically. Allow authenticated users.
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid duplicates during reapply
  DROP POLICY IF EXISTS select_automation_settings_authenticated ON tpr_project_automation_settings;
  DROP POLICY IF EXISTS insert_automation_settings_authenticated ON tpr_project_automation_settings;
  DROP POLICY IF EXISTS update_automation_settings_authenticated ON tpr_project_automation_settings;
  DROP POLICY IF EXISTS delete_automation_settings_authenticated ON tpr_project_automation_settings;
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

CREATE POLICY select_automation_settings_authenticated
  ON tpr_project_automation_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY insert_automation_settings_authenticated
  ON tpr_project_automation_settings
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY update_automation_settings_authenticated
  ON tpr_project_automation_settings
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Optional: allow delete for authenticated users (not used by UI yet)
CREATE POLICY delete_automation_settings_authenticated
  ON tpr_project_automation_settings
  FOR DELETE
  TO authenticated, anon
  USING (true);

-- Ensure privileges (policies govern access when RLS is enabled)
GRANT SELECT, INSERT, UPDATE, DELETE ON tpr_project_automation_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tpr_project_automation_settings TO anon;

-- Done.
