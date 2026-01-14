-- Comprehensive DDL for employee termination records
-- Covers: General info, Payroll calculation options, Final recurring items,
-- Approvers, Cancellation info, Bank accounts, Assigned user groups.
-- Target DB: PostgreSQL (Supabase)

-- Enable pgcrypto for UUID generation (Supabase supports this normally)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Main table: employee_terminations
CREATE TABLE IF NOT EXISTS employee_terminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no text NOT NULL,
  doc_date date,
  effective_date date,
  last_work_date date,
  termination_type text,
  retire_and_continue boolean DEFAULT false,
  ref_doc_no text,
  reason text,
  detail text,

  -- employee snapshot (denormalized for history)
  employee_code text,
  employee_first_name text,
  employee_last_name text,
  employee_full_name text,

  -- optional employee metadata
  unit text,
  position text,

  -- status & workflow
  status text,
  approval_status text,

  -- approval snapshot (top-level / last approver)
  approver_name text,
  approver_code text,
  approver_unit text,
  approver_position text,
  approved_at timestamptz,
  approval_note text,

  -- cancellation
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_unit text,
  cancel_position text,
  cancel_note text,

  -- image / attachments
  image_url text,

  -- payroll / payment schedule
  payment_schedule_template_id text,
  payment_schedule_template text,

  -- calc options kept as JSONB for flexibility; also store normalized recurring items below
  calc_options jsonb,

  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

-- Final recurring items (normalized for query/update)
CREATE TABLE IF NOT EXISTS termination_final_recurring_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termination_id uuid NOT NULL REFERENCES employee_terminations(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(14,2) DEFAULT 0,
  final_method text,
  calculate boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Approvers table (one row per approver step)
CREATE TABLE IF NOT EXISTS termination_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termination_id uuid NOT NULL REFERENCES employee_terminations(id) ON DELETE CASCADE,
  screen_name text,
  approver_code text,
  approver_name text,
  approver_order integer DEFAULT 0,
  is_required boolean DEFAULT false,
  approved boolean DEFAULT false,
  approved_at timestamptz,
  approval_note text,
  created_at timestamptz DEFAULT now()
);

-- Bank accounts associated with the termination (for final payment)
CREATE TABLE IF NOT EXISTS termination_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termination_id uuid NOT NULL REFERENCES employee_terminations(id) ON DELETE CASCADE,
  bank_name text,
  branch text,
  account_name text,
  account_number text,
  percent numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Assigned user groups (if the UI assigns groups / employees for notify/workflow)
CREATE TABLE IF NOT EXISTS termination_user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termination_id uuid NOT NULL REFERENCES employee_terminations(id) ON DELETE CASCADE,
  group_name text,
  assigned_employee_id uuid,
  assigned_employee_name text,
  created_at timestamptz DEFAULT now()
);

-- Indexes to speed common queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_terminations_doc_no ON employee_terminations(doc_no);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_employee_code ON employee_terminations(employee_code);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_effective_date ON employee_terminations(effective_date);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_status ON employee_terminations(status);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_employee_terminations ON employee_terminations;
CREATE TRIGGER set_updated_at_on_employee_terminations
  BEFORE UPDATE ON employee_terminations
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Example: insert into employee_terminations (doc_no, employee_code, employee_full_name, effective_date, termination_type, reason, status, calc_options)
-- Values for calc_options could look like:
-- {
--   "lastPeriod": true,
--   "salary": true,
--   "salaryBasis": "base",
--   "finalOneTime": true,
--   "finalRecurring": true,
--   "carryOverNonRecurring": true,
--   "carryOverEndDate": "2025-11-30",
--   "ssoNextPeriod": true
-- }

-- Notes:
-- 1) This schema stores both a JSONB `calc_options` blob for flexible UI-driven data and a normalized table `termination_final_recurring_items` for rows that need to be edited/queried individually.
-- 2) I intentionally avoided adding foreign key constraints to a specific `employees` table because the existing schema may use different PKs or naming. If you have an `employees(id)` or `employees.employee_code`, we can add FK constraints.
-- 3) If you prefer `id` to be a serial integer instead of UUID for any table, tell me and I'll adjust the migration.
