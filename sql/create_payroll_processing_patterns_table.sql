-- SQL migration: create_payroll_processing_patterns_table.sql
-- Purpose: store payroll processing patterns used by the UI at
-- src/hrm/modules/settings/payroll-processing-patterns.jsx
-- Compatible with PostgreSQL

-- Ensure we have a UUID generator (pgcrypto provides gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing table if you need a clean install (UNCOMMENT to use)
-- DROP TABLE IF EXISTS payroll_processing_patterns;

CREATE TABLE IF NOT EXISTS payroll_processing_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- e.g. PTS202510-00001
  name text NOT NULL,

  -- employee wage mapping
  daily_wage_code text,    -- e.g. IN-001 (references payroll_earn_deduct.code)
  daily_wage_desc text,
  hourly_wage_code text,
  hourly_wage_desc text,

  -- calculation options
  calculate_one_day boolean DEFAULT false,

  -- holiday related options
  holiday_pay_enabled boolean DEFAULT false,
  holiday_max_days integer CHECK (holiday_max_days IS NULL OR holiday_max_days >= 0),

  holiday_emp_daily_enabled boolean DEFAULT false,
  holiday_daily_wage_code text,
  holiday_daily_wage_desc text,

  holiday_emp_hourly_enabled boolean DEFAULT false,
  holiday_hourly_wage_code text,
  holiday_hourly_wage_desc text,

  holiday_pay_daily boolean DEFAULT false,
  holiday_pay_hourly boolean DEFAULT false,

  -- additional rules
  holiday_pay_birth_same_day boolean DEFAULT false,
  holiday_pay_overtime_same_day boolean DEFAULT false,

  -- metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON payroll_processing_patterns;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON payroll_processing_patterns
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Indexes to speed up common queries
CREATE INDEX IF NOT EXISTS idx_ppp_code ON payroll_processing_patterns (code);
CREATE INDEX IF NOT EXISTS idx_ppp_name ON payroll_processing_patterns (name);

-- Example inserts (uncomment to test)
-- INSERT INTO payroll_processing_patterns (code, name, daily_wage_code, daily_wage_desc, hourly_wage_code, hourly_wage_desc, holiday_pay_enabled, holiday_max_days)
-- VALUES ('PTS202510-00001', 'ตัวอย่างรูปแบบ A', 'IN-001', 'ค่าแรงรายวัน', 'IN-002', 'ค่าแรงรายชั่วโมง', true, 5);

-- Select example
-- SELECT * FROM payroll_processing_patterns ORDER BY created_at DESC LIMIT 50;

-- Notes:
-- - wage_code fields are plain text to allow loose coupling with the payroll_earn_deduct table.
--   If you prefer a foreign key relationship, alter the schema to store earn/deduct id (uuid)
--   and add a foreign key constraint to payroll_earn_deduct(id).
-- - This migration uses pgcrypto.gen_random_uuid(). If your environment prefers uuid-ossp,
--   replace gen_random_uuid() with uuid_generate_v4() and enable the uuid-ossp extension instead.
