-- Add education and work_experiences JSONB columns to employees table
BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experiences jsonb DEFAULT '[]'::jsonb;

-- Add GIN indexes for efficient JSONB queries (optional)
CREATE INDEX IF NOT EXISTS idx_employees_education_gin ON public.employees USING gin (education);
CREATE INDEX IF NOT EXISTS idx_employees_work_experiences_gin ON public.employees USING gin (work_experiences);

COMMIT;

-- Notes:
-- These columns store arrays of education or work experience objects.
-- Example education item: { "level": "ปริญญาตรี", "institution": "มหาวิทยาลัย A", "province": "1", "degree": "Bachelor", "major": "คอมพิวเตอร์", "year_graduated": "2015", "gpa": "3.50", "activities": "ชมรม...", "note": "..." }
-- Example work_experience item: { "employer": "บริษัท A", "business_type": "IT", "position": "Developer", "responsibilities": "...", "start_date": "2018-01-01", "end_date": "2020-12-31", "start_salary": "20000", "last_salary": "35000", "reason_for_leaving": "ย้ายงาน", "details": "..." }
