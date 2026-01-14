-- SQL DDL for company calendar feature (Supabase / Postgres)
-- Run this in your Supabase SQL editor or psql connected to the project DB.

-- 1) Ensure extension for UUID generation is available
-- Supabase projects typically have pgcrypto available; if not, ask your DBA.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) company_calendars: basic calendar metadata
CREATE TABLE IF NOT EXISTS public.company_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_en text,
  detail text,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: reference to auth.users (Supabase stores users in auth schema)
-- If you want foreign key constraint to auth.users, uncomment the line below and ensure auth.users exists in your setup.
-- ALTER TABLE public.company_calendars ADD CONSTRAINT fk_cal_created_by FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL;

-- 3) calendar_assignments: store per-date info for a calendar
CREATE TABLE IF NOT EXISTS public.calendar_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.company_calendars(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  day_type text NOT NULL CHECK (day_type IN ('work','weekend','holiday','annual')),
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_calendar_date UNIQUE (calendar_id, assigned_date)
);

-- 4) Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_assignments_calendar_id ON public.calendar_assignments (calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_assignments_assigned_date ON public.calendar_assignments (assigned_date);

-- 5) Trigger functions to keep updated_at fields current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_calendars_updated_at
BEFORE UPDATE ON public.company_calendars
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_calendar_assignments_updated_at
BEFORE UPDATE ON public.calendar_assignments
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- 6) Optional view: summary counts per calendar per month/year (example)
CREATE OR REPLACE VIEW public.view_calendar_month_summary AS
SELECT
  ca.calendar_id,
  date_trunc('month', ca.assigned_date)::date AS month_start,
  SUM(CASE WHEN ca.day_type = 'work' THEN 1 ELSE 0 END) AS work_days,
  SUM(CASE WHEN ca.day_type = 'weekend' THEN 1 ELSE 0 END) AS weekend_days,
  SUM(CASE WHEN ca.day_type = 'holiday' THEN 1 ELSE 0 END) AS holiday_days,
  SUM(CASE WHEN ca.day_type = 'annual' THEN 1 ELSE 0 END) AS annual_days
FROM public.calendar_assignments ca
GROUP BY ca.calendar_id, date_trunc('month', ca.assigned_date)::date;

-- 7) Example row-level security (RLS) policies for Supabase (commented)
-- Enable RLS on tables and add policies that match your auth scheme.
-- NOTE: modify policy expressions to match your project's auth.user_id claim or role.

-- Example: allow authenticated users to read calendars
-- ALTER TABLE public.company_calendars ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public_read_calendars" ON public.company_calendars FOR SELECT USING (true);

-- Example: allow owners to modify their calendars (if you store created_by)
-- CREATE POLICY "owner_modify_calendars" ON public.company_calendars
--   FOR UPDATE, DELETE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Example: enable RLS on assignments
-- ALTER TABLE public.calendar_assignments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public_read_assignments" ON public.calendar_assignments FOR SELECT USING (true);

-- 8) Example sample data (uncomment to seed):
-- INSERT INTO public.company_calendars (code, name, name_en, detail) VALUES ('2025', 'ปฏิทินปี 2025', '2025', 'ตัวอย่างปฏิทิน 2025');
-- INSERT INTO public.calendar_assignments (calendar_id, assigned_date, day_type, title) VALUES (
--   (SELECT id FROM public.company_calendars WHERE code='2025'), '2025-01-01', 'holiday', 'New Year Day'
-- );

-- 9) Helpful queries
-- Get assignments for a calendar and month:
-- SELECT * FROM public.calendar_assignments WHERE calendar_id = '<CAL_ID>' AND assigned_date >= '2025-10-01' AND assigned_date < '2025-11-01' ORDER BY assigned_date;

-- Get calendar list:
-- SELECT * FROM public.company_calendars ORDER BY code DESC;

-- End of file
