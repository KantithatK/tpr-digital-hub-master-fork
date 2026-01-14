BEGIN;

-- 0) DROP TABLE เดิม (ถ้ามี)
DROP TABLE IF EXISTS public.tpr_ot_requests CASCADE;

-- 1) CREATE TABLE ใหม่ (เรียงคอลัมน์ถาวร)
CREATE TABLE public.tpr_ot_requests (
  -- ===== Document =====
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no text NULL,
  doc_period text NULL,
  doc_seq integer NULL,
  status text NOT NULL DEFAULT 'Draft',

  -- ===== Owner / Employee =====
  user_id uuid NULL,
  employee_id uuid NULL,

  -- ===== Date & Time =====
  request_date date NULL,
  work_date date NULL,
  ot_start_time time without time zone NULL,
  ot_end_time time without time zone NULL,

  -- ===== Hours / Project =====
  requested_minutes integer NOT NULL DEFAULT 0,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  type text NULL,
  project_id uuid NULL,

  -- ===== Reason & Attachment =====
  reason text NULL,
  note text NULL,
  special_reason text NULL,
  attachment_url text NULL,

  -- ===== Approval Flow =====
  submitted_at timestamptz NULL,
  submitted_by uuid NULL,
  approved_at timestamptz NULL,
  approved_by uuid NULL,
  rejected_at timestamptz NULL,
  rejected_by uuid NULL,
  rejected_reason text NULL,
  canceled_at timestamptz NULL,
  canceled_by uuid NULL,

  -- ===== System =====
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- ===== FK =====
  CONSTRAINT fk_tpr_ot_requests_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_tpr_ot_requests_user
    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 2) Indexes
CREATE INDEX idx_tpr_ot_requests_status
  ON public.tpr_ot_requests(status);

CREATE UNIQUE INDEX ux_tpr_ot_requests_doc_no
  ON public.tpr_ot_requests(doc_no)
  WHERE doc_no IS NOT NULL;

CREATE UNIQUE INDEX ux_ot_requests_user_work_date
  ON public.tpr_ot_requests(user_id, work_date);

CREATE UNIQUE INDEX ux_ot_requests_employee_request_date
  ON public.tpr_ot_requests(employee_id, request_date);

CREATE INDEX idx_ot_requests_user_work_date
  ON public.tpr_ot_requests(user_id, work_date);

CREATE INDEX idx_ot_requests_employee_request_date
  ON public.tpr_ot_requests(employee_id, request_date);

-- 3) Triggers
CREATE TRIGGER trg_ot_requests_doc_no
BEFORE INSERT ON public.tpr_ot_requests
FOR EACH ROW
WHEN (NEW.doc_no IS NULL)
EXECUTE FUNCTION public.tpr_ot_requests_set_doc_no();

CREATE TRIGGER trg_ot_requests_sync
BEFORE INSERT OR UPDATE ON public.tpr_ot_requests
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_ot_requests_columns();

CREATE TRIGGER trg_ot_requests_updated_at
BEFORE UPDATE ON public.tpr_ot_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
