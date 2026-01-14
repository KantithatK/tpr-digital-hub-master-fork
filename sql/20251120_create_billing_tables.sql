-- Migration: Create billing settings and billing periods tables
-- Date: 2025-11-20
-- Notes: Designed for PostgreSQL (Supabase) with public.tpr_projects (uuid PK)

-- 1) Create enum types for pattern and status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tpr_billing_pattern') THEN
        CREATE TYPE tpr_billing_pattern AS ENUM ('monthly', 'milestone', 'oneoff', 'percent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tpr_billing_status') THEN
        CREATE TYPE tpr_billing_status AS ENUM ('draft', 'scheduled', 'invoiced', 'paid', 'canceled');
    END IF;
END$$;

-- 2) Billing settings per project
CREATE TABLE IF NOT EXISTS public.tpr_project_billing_settings (
    id bigserial PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.tpr_projects(id) ON DELETE CASCADE,
    billing_pattern tpr_billing_pattern NOT NULL DEFAULT 'monthly',
    credit_term_days integer NOT NULL DEFAULT 30,

    -- monthly-specific
    monthly_billing_day varchar(10) NOT NULL DEFAULT 'EOM', -- '1','15','30','EOM'
    monthly_start_month date,  -- first day of month (e.g. '2025-11-01')
    monthly_end_month date,

    -- extensible settings for other patterns
    extra jsonb DEFAULT '{}'::jsonb,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tpr_billing_settings_monthly_day_check
        CHECK (monthly_billing_day IN ('1','15','30','EOM')),
    CONSTRAINT tpr_project_billing_settings_project_pattern_unique
        UNIQUE (project_id, billing_pattern)
);

-- 3) Billing periods table (one row per installment / period)
CREATE TABLE IF NOT EXISTS public.tpr_project_billing_periods (
    id bigserial PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.tpr_projects(id) ON DELETE CASCADE,
    billing_pattern tpr_billing_pattern NOT NULL DEFAULT 'monthly',
    period_no integer NOT NULL, -- 1,2,3...
    period_label text,          -- e.g. 'พ.ย. 2568' or 'งวด Concept'
    billing_date date,          -- date to issue invoice
    due_date date,              -- payment due date
    amount numeric(14,2) NOT NULL DEFAULT 0,
    currency varchar(3) DEFAULT 'THB',
    status tpr_billing_status NOT NULL DEFAULT 'draft',
    metadata jsonb DEFAULT '{}'::jsonb, -- for milestone id, comments, etc.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tpr_billing_periods_project_period_no_unique
        UNIQUE (project_id, period_no)
);

-- 4) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tpr_billing_periods_project_id
    ON public.tpr_project_billing_periods (project_id);

CREATE INDEX IF NOT EXISTS idx_tpr_billing_periods_project_status
    ON public.tpr_project_billing_periods (project_id, status);

CREATE INDEX IF NOT EXISTS idx_tpr_billing_settings_project_id
    ON public.tpr_project_billing_settings (project_id);

-- 5) Trigger helper to keep updated_at current
CREATE OR REPLACE FUNCTION public.tpr_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_tpr_billing_settings_updated_at
    ON public.tpr_project_billing_settings;
CREATE TRIGGER trg_tpr_billing_settings_updated_at
BEFORE UPDATE ON public.tpr_project_billing_settings
FOR EACH ROW EXECUTE PROCEDURE public.tpr_set_updated_at();

DROP TRIGGER IF EXISTS trg_tpr_billing_periods_updated_at
    ON public.tpr_project_billing_periods;
CREATE TRIGGER trg_tpr_billing_periods_updated_at
BEFORE UPDATE ON public.tpr_project_billing_periods
FOR EACH ROW EXECUTE PROCEDURE public.tpr_set_updated_at();

-- 6) View: periods joined with settings
CREATE OR REPLACE VIEW public.v_tpr_project_billing_with_settings AS
SELECT
    p.*,
    s.billing_pattern AS setting_pattern,
    s.credit_term_days,
    s.monthly_billing_day,
    s.monthly_start_month,
    s.monthly_end_month,
    s.extra
FROM public.tpr_project_billing_periods p
LEFT JOIN public.tpr_project_billing_settings s
    ON p.project_id = s.project_id
   AND p.billing_pattern = s.billing_pattern;
