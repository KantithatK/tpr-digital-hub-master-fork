-- Migration: create tables to store project contract & finance data
-- - tpr_project_finances: main contract/finance fields (excluding service rates)
-- - tpr_project_positions: selected positions for a project (no rates here)
-- - tpr_project_service_rates: service rates stored separately per project+position
-- Date: 2025-11-19

-- Ensure UUID generator (pgcrypto) is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Main finance/contract table (one row per project)
CREATE TABLE IF NOT EXISTS tpr_project_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES tpr_projects(id) ON DELETE CASCADE,
  contract_type text,
  contract_value numeric(14,2), -- มูลค่าสัญญารวม
  fees_budget numeric(14,2),    -- งบค่าบริการ
  consultants_budget numeric(14,2), -- งบที่ปรึกษา
  expenses_budget numeric(14,2), -- งบค่าใช้จ่ายตรง
  labor_cost numeric(14,2),     -- ต้นทุนแรงงานรวม (optional)
  billing_cycle text,
  credit_days integer,
  memo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Selected positions for a project (no hourly rates stored here)
CREATE TABLE IF NOT EXISTS tpr_project_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES tpr_projects(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tpr_project_positions_project_position
  ON tpr_project_positions(project_id, position_id);

-- Service rates stored separately so they can be managed independently
CREATE TABLE IF NOT EXISTS tpr_project_service_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES tpr_projects(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  rate numeric(10,2) NOT NULL,
  effective_at date,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMIT;

-- Optional: add simple trigger to keep updated_at current (left commented)
-- CREATE OR REPLACE FUNCTION tpr_update_timestamp()
-- RETURNS trigger AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_tpr_project_finances_updated_at
-- BEFORE UPDATE ON tpr_project_finances
-- FOR EACH ROW EXECUTE PROCEDURE tpr_update_timestamp();
