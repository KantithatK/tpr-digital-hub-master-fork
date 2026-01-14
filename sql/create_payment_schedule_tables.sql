-- SQL script to create payment schedule templates and details tables for Supabase (Postgres)
-- Run this in the Supabase SQL editor or via psql connected to your Supabase DB.

-- 1) Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Templates table (master)
CREATE TABLE IF NOT EXISTS payroll_payment_schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  year integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- 3) Detail table (monthly rows)
CREATE TABLE IF NOT EXISTS payroll_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES payroll_payment_schedule_templates(id) ON DELETE CASCADE,
  month_index integer NOT NULL,
  month_name text,
  payment_date date,
  period_start date,
  period_end date,
  work_start date,
  work_end date,
  ot_start date,
  ot_end date,
  welfare_start date,
  welfare_end date,
  absent_start date,
  absent_end date,
  leave_start date,
  leave_end date,
  late_start date,
  late_end date,
  wrong_start date,
  wrong_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (template_id, month_index)
);

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_template_id ON payroll_payment_schedules (template_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_month_index ON payroll_payment_schedules (month_index);

-- 5) Row-Level Security (RLS) setup (optional)
-- If you want to enable RLS and allow authenticated users to manage these rows, you can enable RLS and create simple policies.
-- If you prefer to keep RLS off for development/testing, skip the ALTER TABLE ... ENABLE ROW LEVEL SECURITY lines.

-- Enable RLS (uncomment if desired)
-- ALTER TABLE payroll_payment_schedule_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payroll_payment_schedules ENABLE ROW LEVEL SECURITY;

-- Example permissive policies for authenticated users (uncomment after enabling RLS):
-- CREATE POLICY "Templates: full access for authenticated" ON payroll_payment_schedule_templates
--   FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
--
-- CREATE POLICY "Schedules: full access for authenticated" ON payroll_payment_schedules
--   FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 6) Grant privileges to authenticated role if you prefer (optional)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_payment_schedule_templates TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_payment_schedules TO authenticated;

-- End of script
