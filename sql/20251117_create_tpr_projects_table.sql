-- SQL: 20251117_create_tpr_projects_table.sql
-- Create core projects table for TPR application
-- Table names are prefixed with `tpr_` as requested.

-- Use pgcrypto for gen_random_uuid(); if your DB uses uuid-ossp change accordingly
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create main projects table
CREATE TABLE IF NOT EXISTS tpr_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code varchar(64) NOT NULL UNIQUE,

  -- titles / names (support Thai / EN if needed)
  name_th varchar(400),
  name_en varchar(400),
  description text,

  -- customer reference (tpr_customers expected)
  customer_id uuid,
  customer_code varchar(128),
  customer_name varchar(400),

  -- schedule
  start_date date,
  end_date date,

  -- people (references employees table)
  manager_id uuid,
  principal_id uuid,

  -- contract / finance
  contract_type varchar(128) DEFAULT 'Fixed Fee',
  budget numeric(14,2) DEFAULT 0,

  -- status & progress
  status varchar(64) DEFAULT 'Planning',
  progress integer DEFAULT 0,

  -- misc
  tags varchar(500),
  archived boolean DEFAULT false,

  -- audit
  created_by varchar(200),
  created_at timestamptz DEFAULT now(),
  updated_by varchar(200),
  updated_at timestamptz DEFAULT now(),
  deleted boolean DEFAULT false,
  deleted_at timestamptz
);

-- Foreign keys (use ON DELETE SET NULL to preserve project record if ref removed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_customers') THEN
    ALTER TABLE tpr_projects
      ADD CONSTRAINT fk_tpr_projects_customer FOREIGN KEY (customer_id) REFERENCES tpr_customers(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'employees') THEN
    ALTER TABLE tpr_projects
      ADD CONSTRAINT fk_tpr_projects_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL,
      ADD CONSTRAINT fk_tpr_projects_principal FOREIGN KEY (principal_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- ignore if constraints already exist
  NULL;
END$$;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tpr_projects_customer_id ON tpr_projects (customer_id);
CREATE INDEX IF NOT EXISTS idx_tpr_projects_manager_id ON tpr_projects (manager_id);
CREATE INDEX IF NOT EXISTS idx_tpr_projects_principal_id ON tpr_projects (principal_id);
CREATE INDEX IF NOT EXISTS idx_tpr_projects_status ON tpr_projects (status);
CREATE INDEX IF NOT EXISTS idx_tpr_projects_project_code ON tpr_projects (project_code);
CREATE INDEX IF NOT EXISTS idx_tpr_projects_start_date ON tpr_projects (start_date);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION trg_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_tpr_projects ON tpr_projects;
CREATE TRIGGER set_timestamp_tpr_projects
BEFORE UPDATE ON tpr_projects
FOR EACH ROW
EXECUTE FUNCTION trg_set_timestamp();

-- Done.
