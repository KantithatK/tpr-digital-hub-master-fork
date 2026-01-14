-- Migration: create table for position & salary adjustments
-- Generated: 2025-11-07
-- Notes:
-- - ใช้ UNIQUE INDEX + ALTER ... USING INDEX เพื่อเลี่ยง syntax ที่ไม่รองรับ: ADD CONSTRAINT IF NOT EXISTS

-- Ensure pgcrypto (for gen_random_uuid) is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store position & salary adjustment records
CREATE TABLE IF NOT EXISTS public.employee_position_salary_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no varchar(100) NOT NULL,
  doc_date date,
  propose_date date,
  effective_date date,
  note text,

  -- employee snapshot
  employee_code varchar(100),
  employee_first_name varchar(200),
  employee_last_name varchar(200),
  employee_full_name varchar(400),

  -- supervisor stored as FK to employees.id (nullable)
  supervisor_id uuid NULL,

  employee_type varchar(100),

  -- department snapshot/text (we store display name for stability)
  department_name varchar(300),
  position varchar(300),
  level varchar(300),

  adjustment_type varchar(300),

  -- approval / cancel fields
  approval_status varchar(100),
  approved_at timestamptz,
  approver_name varchar(300),
  approver_unit varchar(300),
  approver_position varchar(300),
  approval_note text,

  cancelled_at timestamptz,
  cancelled_by varchar(300),
  cancel_unit varchar(300),
  cancel_position varchar(300),
  cancel_note text,

  status varchar(100) DEFAULT 'รออนุมัติ',

  -- JSON details (captures boxes 1..4 and any child rows)
  adjust_details jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: foreign key to employees (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'fk_adjustments_supervisor'
      AND c.conrelid = 'public.employee_position_salary_adjustments'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.employee_position_salary_adjustments
        ADD CONSTRAINT fk_adjustments_supervisor
        FOREIGN KEY (supervisor_id)
        REFERENCES public.employees(id)
        ON DELETE SET NULL;
    EXCEPTION WHEN undefined_table THEN
      -- employees table not present in this schema; skip adding FK
      RAISE NOTICE 'employees table not found; skipping FK on supervisor_id';
    END;
  END IF;
END$$;

-- ===== Fix for your error: use UNIQUE INDEX + attach as CONSTRAINT =====
-- 1) Create a unique index (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_position_salary_adjustments_doc_no_idx
  ON public.employee_position_salary_adjustments (doc_no);

-- 2) Attach it as a named UNIQUE constraint if it's not there yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_employee_position_salary_adjustments_doc_no'
      AND conrelid = 'public.employee_position_salary_adjustments'::regclass
  ) THEN
    ALTER TABLE public.employee_position_salary_adjustments
      ADD CONSTRAINT uq_employee_position_salary_adjustments_doc_no
      UNIQUE USING INDEX uq_employee_position_salary_adjustments_doc_no_idx;
  END IF;
END$$;
-- =====================================================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_adjustments_employee_code
  ON public.employee_position_salary_adjustments (employee_code);

CREATE INDEX IF NOT EXISTS idx_adjustments_employee_full_name
  ON public.employee_position_salary_adjustments
  USING gin (to_tsvector('simple', coalesce(employee_full_name, '')));

CREATE INDEX IF NOT EXISTS idx_adjustments_propose_date
  ON public.employee_position_salary_adjustments (propose_date);

CREATE INDEX IF NOT EXISTS idx_adjustments_status
  ON public.employee_position_salary_adjustments (status);

-- Trigger to keep updated_at current on update
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.employee_position_salary_adjustments;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.employee_position_salary_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- End of migration
