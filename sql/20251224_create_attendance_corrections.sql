BEGIN;

-- =========================================================
-- A) Ensure running numbers table exists (shared counter)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tpr_running_numbers (
  key text PRIMARY KEY,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- B) Drop triggers safely (only if table exists)
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='tpr_attendance_corrections'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_attendance_corrections_doc_no ON public.tpr_attendance_corrections';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_attendance_corrections_updated_at ON public.tpr_attendance_corrections';
  END IF;
END$$;

-- =========================================================
-- C) Drop functions (safe)
-- =========================================================
DROP FUNCTION IF EXISTS public.tpr_attendance_corrections_set_doc_no();
DROP FUNCTION IF EXISTS public.tpr_next_attendance_correction_doc_no(date);
DROP FUNCTION IF EXISTS public.tpr_create_attendance_correction_draft(uuid,date,timestamptz,timestamptz,text,text,text);

-- =========================================================
-- D) Drop table (safe)
-- =========================================================
DROP TABLE IF EXISTS public.tpr_attendance_corrections CASCADE;

-- =========================================================
-- E) Create table: tpr_attendance_corrections
-- =========================================================
CREATE TABLE public.tpr_attendance_corrections (
  -- ===== Identity / Document =====
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no text NULL,
  doc_period text NULL,
  doc_seq integer NULL,

  -- ===== Owner / Date =====
  user_id uuid NOT NULL,
  work_date date NOT NULL,

  -- ===== Snapshot =====
  original_clock_in_at timestamptz NULL,
  original_clock_out_at timestamptz NULL,
  original_actual_minutes integer NOT NULL DEFAULT 0,

  -- ===== Requested changes =====
  requested_clock_in_at timestamptz NULL,
  requested_clock_out_at timestamptz NULL,

  correction_type text NOT NULL DEFAULT 'ADJUST', -- MISS_IN / MISS_OUT / ADJUST / CANCEL

  -- ===== Reason / Attachment =====
  reason text NOT NULL,
  note text NULL,
  attachment_url text NULL,

  -- ===== Workflow =====
  status text NOT NULL DEFAULT 'Draft',
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
  created_by uuid NULL,
  updated_by uuid NULL,

  -- ===== Constraints =====
  CONSTRAINT fk_att_corr_employee
    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE,

  CONSTRAINT chk_att_corr_status
    CHECK (status IN ('Draft','Submitted','Approved','Rejected','Canceled')),

  CONSTRAINT chk_att_corr_type
    CHECK (correction_type IN ('MISS_IN','MISS_OUT','ADJUST','CANCEL')),

  CONSTRAINT chk_att_corr_has_requested
    CHECK (requested_clock_in_at IS NOT NULL OR requested_clock_out_at IS NOT NULL)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_attendance_corrections_doc_no
  ON public.tpr_attendance_corrections(doc_no)
  WHERE doc_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_attendance_corrections_user_workdate_open
  ON public.tpr_attendance_corrections(user_id, work_date)
  WHERE status IN ('Draft','Submitted');

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_user_date
  ON public.tpr_attendance_corrections(user_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status
  ON public.tpr_attendance_corrections(status);

-- =========================================================
-- F) Function: next doc number REPYYYYMM#### (same principle as OT/Leave)
-- =========================================================
CREATE OR REPLACE FUNCTION public.tpr_next_attendance_correction_doc_no(p_work_date date)
RETURNS TABLE(doc_no text, doc_period text, doc_seq integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_period text;
  v_key text;
  v_seq integer;
BEGIN
  v_period := to_char(coalesce(p_work_date, current_date), 'YYYYMM');
  v_key := 'REP-' || v_period;

  WITH ins AS (
    INSERT INTO public.tpr_running_numbers(key, current_value, updated_at)
    VALUES (v_key, 1, now())
    ON CONFLICT (key) DO UPDATE
      SET current_value = public.tpr_running_numbers.current_value + 1,
          updated_at = now()
    RETURNING current_value
  )
  SELECT current_value INTO v_seq FROM ins LIMIT 1;

  doc_seq := v_seq;
  doc_period := v_period;
  doc_no := 'REP' || v_period || lpad(v_seq::text, 4, '0');
  RETURN NEXT;
END;
$$;

-- =========================================================
-- G) Trigger function: assign doc_no
-- =========================================================
CREATE OR REPLACE FUNCTION public.tpr_attendance_corrections_set_doc_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_doc text;
  v_period text;
  v_seq integer;
  v_date date;
BEGIN
  IF NEW.doc_no IS NULL THEN
    v_date := COALESCE(NEW.work_date, current_date);

    SELECT doc_no, doc_period, doc_seq
      INTO v_doc, v_period, v_seq
      FROM public.tpr_next_attendance_correction_doc_no(v_date);

    NEW.doc_no := v_doc;
    NEW.doc_period := v_period;
    NEW.doc_seq := v_seq;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_corrections_doc_no
BEFORE INSERT ON public.tpr_attendance_corrections
FOR EACH ROW
WHEN (NEW.doc_no IS NULL)
EXECUTE FUNCTION public.tpr_attendance_corrections_set_doc_no();

-- =========================================================
-- H) updated_at trigger (uses your existing set_updated_at())
-- =========================================================
CREATE TRIGGER trg_attendance_corrections_updated_at
BEFORE UPDATE ON public.tpr_attendance_corrections
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- I) RPC: create draft with snapshot from tpr_attendance_daily
-- =========================================================
CREATE OR REPLACE FUNCTION public.tpr_create_attendance_correction_draft(
  p_user_id uuid,
  p_work_date date,
  p_requested_clock_in_at timestamptz,
  p_requested_clock_out_at timestamptz,
  p_reason text,
  p_note text DEFAULT NULL,
  p_attachment_url text DEFAULT NULL
)
RETURNS SETOF public.tpr_attendance_corrections
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily record;
  v_type text := 'ADJUST';
  _row public.tpr_attendance_corrections%ROWTYPE;
BEGIN
  SELECT clock_in_at, clock_out_at, actual_minutes
    INTO v_daily
  FROM public.tpr_attendance_daily
  WHERE user_id = p_user_id AND work_date = p_work_date;

  IF (v_daily.clock_in_at IS NULL) AND (p_requested_clock_in_at IS NOT NULL) AND (p_requested_clock_out_at IS NULL) THEN
    v_type := 'MISS_IN';
  ELSIF (v_daily.clock_in_at IS NOT NULL) AND (v_daily.clock_out_at IS NULL) AND (p_requested_clock_out_at IS NOT NULL) AND (p_requested_clock_in_at IS NULL) THEN
    v_type := 'MISS_OUT';
  ELSE
    v_type := 'ADJUST';
  END IF;

  INSERT INTO public.tpr_attendance_corrections(
    user_id, work_date,
    original_clock_in_at, original_clock_out_at, original_actual_minutes,
    requested_clock_in_at, requested_clock_out_at,
    correction_type,
    reason, note, attachment_url,
    status,
    created_at, updated_at,
    created_by, updated_by
  )
  VALUES (
    p_user_id, p_work_date,
    v_daily.clock_in_at, v_daily.clock_out_at, COALESCE(v_daily.actual_minutes, 0),
    p_requested_clock_in_at, p_requested_clock_out_at,
    v_type,
    p_reason, p_note, p_attachment_url,
    'Draft',
    now(), now(),
    p_user_id, p_user_id
  )
  RETURNING * INTO _row;

  RETURN QUERY SELECT * FROM public.tpr_attendance_corrections WHERE id = _row.id;
END;
$$;

COMMIT;
