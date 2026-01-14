-- Create extension for gen_random_uuid (pgcrypto). Supabase usually has this available.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Global company-level markup settings. One row per company (company_id optional).
CREATE TABLE IF NOT EXISTS tpr_markup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text, -- optional tenant/company identifier
  standard_hours integer NOT NULL DEFAULT 160,
  overhead_percent numeric(7,2) NOT NULL DEFAULT 0,
  profit_percent numeric(7,2) NOT NULL DEFAULT 0,
  billrate_method text DEFAULT 'by_position', -- e.g. 'by_position' | 'default_but_pm_edit'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ensure only one settings row per company_id when company_id provided
CREATE UNIQUE INDEX IF NOT EXISTS tpr_markup_settings_company_id_idx ON tpr_markup_settings (company_id) WHERE company_id IS NOT NULL;

-- Profiles table for specific contract/customer/project markup overrides
CREATE TABLE IF NOT EXISTS tpr_markup_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type text,
  customer_group text,
  project_type text,
  markup_percent numeric(7,2) NOT NULL DEFAULT 0,
  note text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for faster lookups when matching profiles
CREATE INDEX IF NOT EXISTS tpr_markup_profiles_contract_type_idx ON tpr_markup_profiles (contract_type);
CREATE INDEX IF NOT EXISTS tpr_markup_profiles_customer_group_idx ON tpr_markup_profiles (customer_group);
CREATE INDEX IF NOT EXISTS tpr_markup_profiles_project_type_idx ON tpr_markup_profiles (project_type);
CREATE INDEX IF NOT EXISTS tpr_markup_profiles_active_idx ON tpr_markup_profiles (active);

-- Reuse / create helper trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION tpr_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to keep updated_at in sync
DROP TRIGGER IF EXISTS trg_tpr_markup_settings_updated_at ON tpr_markup_settings;
CREATE TRIGGER trg_tpr_markup_settings_updated_at
BEFORE UPDATE ON tpr_markup_settings
FOR EACH ROW
EXECUTE PROCEDURE tpr_set_updated_at();

DROP TRIGGER IF EXISTS trg_tpr_markup_profiles_updated_at ON tpr_markup_profiles;
CREATE TRIGGER trg_tpr_markup_profiles_updated_at
BEFORE UPDATE ON tpr_markup_profiles
FOR EACH ROW
EXECUTE PROCEDURE tpr_set_updated_at();

-- Example inserts (commented)
-- INSERT INTO tpr_markup_settings (company_id, standard_hours, overhead_percent, profit_percent, billrate_method, created_by) VALUES ('ACME', 160, 20.00, 15.00, 'by_position', 'admin@example.com');
-- INSERT INTO tpr_markup_profiles (contract_type, customer_group, project_type, markup_percent, note, created_by) VALUES ('Fixed', 'ราชการ', 'อาคาร', 25.00, 'งานภาครัฐมีต้นทุนเพิ่ม', 'admin@example.com');
