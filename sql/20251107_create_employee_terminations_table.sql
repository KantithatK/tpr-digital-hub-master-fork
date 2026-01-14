-- 2025-11-07: Create minimal table for employee termination records
-- Designed for PostgreSQL / Supabase

CREATE TABLE IF NOT EXISTS public.employee_terminations (
  id BIGSERIAL PRIMARY KEY,
  doc_no VARCHAR(64) NOT NULL UNIQUE,
  employee_code VARCHAR(64) NOT NULL,
  employee_name VARCHAR(400) NOT NULL,
  effective_date DATE,
  termination_type VARCHAR(100),
  reason TEXT,
  status VARCHAR(100),

  created_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_terminations_employee_code ON public.employee_terminations(employee_code);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_doc_no ON public.employee_terminations(doc_no);
CREATE INDEX IF NOT EXISTS idx_employee_terminations_effective_date ON public.employee_terminations(effective_date);

-- Example insert (optional)
-- INSERT INTO public.employee_terminations (doc_no, employee_code, employee_name, effective_date, termination_type, reason, status, created_by)
-- VALUES ('RES202511-0001','E0001','สมชาย ใจดี','2025-11-30','ลาออก','ยื่นใบลาออกด้วยตนเอง','draft','system');
