BEGIN;

-- 1) Add columns: doc_no / doc_period / doc_seq
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tpr_leave_requests' AND column_name='doc_no'
  ) THEN
    ALTER TABLE public.tpr_leave_requests ADD COLUMN doc_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tpr_leave_requests' AND column_name='doc_period'
  ) THEN
    ALTER TABLE public.tpr_leave_requests ADD COLUMN doc_period text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tpr_leave_requests' AND column_name='doc_seq'
  ) THEN
    ALTER TABLE public.tpr_leave_requests ADD COLUMN doc_seq integer;
  END IF;
END$$;

-- 2) Ensure running numbers table exists (shared with OT)
CREATE TABLE IF NOT EXISTS public.tpr_running_numbers (
  key text PRIMARY KEY,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Unique index for doc_no (ignore null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND n.nspname='public' AND c.relname='ux_tpr_leave_requests_doc_no'
  ) THEN
    CREATE UNIQUE INDEX ux_tpr_leave_requests_doc_no
      ON public.tpr_leave_requests(doc_no)
      WHERE doc_no IS NOT NULL;
  END IF;
END$$;

-- 4) Function: next leave doc no (same style as OT) using DATE input
CREATE OR REPLACE FUNCTION public.tpr_next_leave_doc_no(p_request_date date)
RETURNS TABLE(doc_no text, doc_period text, doc_seq integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_period text;
  v_key text;
  v_seq integer;
BEGIN
  v_period := to_char(coalesce(p_request_date, current_date), 'YYYYMM');
  v_key := 'LEV-' || v_period;

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
  doc_no := 'LEV' || v_period || lpad(v_seq::text, 4, '0');
  RETURN NEXT;
END;
$$;

-- 5) Trigger function: assign doc_no before insert (same style as OT)
-- ใช้วันที่จาก start_at เป็นตัวกำหนดเดือน (แปลงเป็น date)
CREATE OR REPLACE FUNCTION public.tpr_leave_requests_set_doc_no()
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
    -- ให้ “เหมือน OT” ที่ใช้ date: แปลง start_at -> date (แนะนำใช้ Asia/Bangkok ให้ตรงการใช้งานจริง)
    v_date := COALESCE((NEW.start_at AT TIME ZONE 'Asia/Bangkok')::date, current_date);

    SELECT doc_no, doc_period, doc_seq
      INTO v_doc, v_period, v_seq
      FROM public.tpr_next_leave_doc_no(v_date);

    NEW.doc_no := v_doc;
    NEW.doc_period := v_period;
    NEW.doc_seq := v_seq;
  END IF;

  RETURN NEW;
END;
$$;

-- 6) Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname='trg_leave_requests_doc_no'
      AND n.nspname='public'
      AND c.relname='tpr_leave_requests'
  ) THEN
    CREATE TRIGGER trg_leave_requests_doc_no
      BEFORE INSERT ON public.tpr_leave_requests
      FOR EACH ROW
      WHEN (NEW.doc_no IS NULL)
      EXECUTE FUNCTION public.tpr_leave_requests_set_doc_no();
  END IF;
END$$;

COMMIT;
