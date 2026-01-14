-- SQL migration / helper for leave_type and rules storage
-- File: sql/create_leave_type_table.sql

-- Notes:
-- - Designed for PostgreSQL (Supabase).
-- - Creates table `leave_type` if not exists with commonly used columns.
-- - Adds a flexible JSONB column `leave_rules` to store monthly/daily deduction rules.
-- - Adds a GIN index on leave_rules for efficient JSON queries and an index on leave_id.
-- - Adds a trigger to keep updated_at current.
-- - Includes example JSON structure and sample insert.

-- Enable pgcrypto for gen_random_uuid (Supabase typically allows this extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leave_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id text NOT NULL UNIQUE,
  leave_name_th text NOT NULL,
  leave_name_en text,
  leave_group text,
  allowed_days integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  -- Flexible rules stored as JSONB. Example structure below in comments.
  leave_rules jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Ensure leave_rules column exists (for migrations where table already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_type' AND column_name = 'leave_rules'
  ) THEN
    ALTER TABLE public.leave_type
      ADD COLUMN leave_rules jsonb;
  END IF;
END$$;

-- 3) Indexes: unique on leave_id (already created by table definition), and GIN on leave_rules
CREATE INDEX IF NOT EXISTS idx_leave_type_leave_rules_gin ON public.leave_type USING gin (leave_rules);
CREATE INDEX IF NOT EXISTS idx_leave_type_leave_group ON public.leave_type (leave_group);

-- 4) Trigger function to update updated_at on row update
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_leave_type_updated_at ON public.leave_type;
CREATE TRIGGER trg_leave_type_updated_at
BEFORE UPDATE ON public.leave_type
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 5) Example structure for `leave_rules` (stored as JSONB)
--
-- {
--   "monthly": {
--     "enabled": true,
--     "type": "hold_pay" | "hold_pay_over" | "over_days",
--     "days": 3,
--     "pay_code": "DE-001",
--     "pay_name": "หักขาดงาน"
--   },
--   "daily": {
--     "enabled": false,
--     "type": "hold_pay",
--     "days": 0,
--     "pay_code": "",
--     "pay_name": ""
--   }
-- }
--
-- You can query JSON fields, for example:
-- SELECT * FROM public.leave_type WHERE (leave_rules->'monthly'->>'enabled')::boolean = true;

-- 6) Example insert (replace values as needed)
-- INSERT INTO public.leave_type (leave_id, leave_name_th, leave_group, allowed_days, description, leave_rules)
-- VALUES (
--   'LV-ANNUAL', 'ลาพักร้อน', 'ลาพักร้อน', 6, 'ลาพักร้อนประจำปี',
--   '{
--      "monthly": { "enabled": true, "type": "hold_pay", "days": 0, "pay_code": "DE-001", "pay_name": "หักขาดงาน" },
--      "daily": { "enabled": false, "type": "hold_pay", "days": 0, "pay_code": "", "pay_name": "" }
--    }'::jsonb
-- );

-- 7) Optional: helper view to expose flattened columns for rules
CREATE OR REPLACE VIEW public.v_leave_type_rules AS
SELECT
  id,
  leave_id,
  leave_name_th,
  leave_name_en,
  leave_group,
  allowed_days,
  description,
  is_active,
  created_at,
  updated_at,
  (leave_rules->'monthly'->>'enabled')::boolean AS monthly_enabled,
  leave_rules->'monthly'->>'type' AS monthly_type,
  (leave_rules->'monthly'->>'days')::int AS monthly_days,
  leave_rules->'monthly'->>'pay_code' AS monthly_pay_code,
  leave_rules->'monthly'->>'pay_name' AS monthly_pay_name,
  (leave_rules->'daily'->>'enabled')::boolean AS daily_enabled,
  leave_rules->'daily'->>'type' AS daily_type,
  (leave_rules->'daily'->>'days')::int AS daily_days,
  leave_rules->'daily'->>'pay_code' AS daily_pay_code,
  leave_rules->'daily'->>'pay_name' AS daily_pay_name
FROM public.leave_type;

-- End of migration
