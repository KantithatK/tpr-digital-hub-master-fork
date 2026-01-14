-- Migration: create employee_bank_accounts table (idempotent)
-- Adds a table to store employee bank account rows and an index.
BEGIN;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bank_name varchar(300),
  branch varchar(200),
  account_name varchar(300),
  account_number varchar(128),
  percent numeric(6,2),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- index for lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_employee_bank_accounts_employee_id'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_employee_bank_accounts_employee_id ON employee_bank_accounts(employee_id);
  END IF;
END$$;

COMMIT;

-- Notes:
-- 1) Percent stored as numeric(6,2) to allow values like 100.00
-- 2) FK uses ON DELETE CASCADE so bank rows are removed when an employee is removed.