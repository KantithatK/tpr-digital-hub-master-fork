BEGIN;

-- A) Add columns: doc_no / doc_period / doc_seq
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tpr_ot_requests' AND column_name='doc_no'
  ) THEN
    ALTER TABLE public.tpr_ot_requests ADD COLUMN doc_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tpr_ot_requests' AND column_name='doc_period'
  ) THEN
    ALTER TABLE public.tpr_ot_requests ADD COLUMN doc_period text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tpr_ot_requests' AND column_name='doc_seq'
  ) THEN
    ALTER TABLE public.tpr_ot_requests ADD COLUMN doc_seq integer;
  END IF;
END$$;

-- B) Running numbers table
CREATE TABLE IF NOT EXISTS public.tpr_running_numbers (
  key text PRIMARY KEY,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- C) Unique index for doc_no (ignore null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND n.nspname='public' AND c.relname='ux_tpr_ot_requests_doc_no'
  ) THEN
    CREATE UNIQUE INDEX ux_tpr_ot_requests_doc_no
      ON public.tpr_ot_requests(doc_no)
      WHERE doc_no IS NOT NULL;
  END IF;
END$$;

-- D) Next number function (atomic)
CREATE OR REPLACE FUNCTION public.tpr_next_ot_doc_no(p_request_date date)
RETURNS TABLE(doc_no text, doc_period text, doc_seq integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_period text;
  v_key text;
  v_seq integer;
BEGIN
  v_period := to_char(coalesce(p_request_date, current_date), 'YYYYMM');
  v_key := 'OTT-' || v_period;

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
  doc_no := 'OTT' || v_period || lpad(v_seq::text, 4, '0');
  RETURN NEXT;
END;
$$;

-- E) Trigger function assign doc_no robustly (uses request_date/work_date)
CREATE OR REPLACE FUNCTION public.tpr_ot_requests_set_doc_no()
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
    v_date := coalesce(NEW.request_date, NEW.work_date, current_date);

    SELECT doc_no, doc_period, doc_seq
      INTO v_doc, v_period, v_seq
      FROM public.tpr_next_ot_doc_no(v_date);

    NEW.doc_no := v_doc;
    NEW.doc_period := v_period;
    NEW.doc_seq := v_seq;
  END IF;

  RETURN NEW;
END;
$$;

-- F) Create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname='trg_ot_requests_doc_no'
      AND n.nspname='public'
      AND c.relname='tpr_ot_requests'
  ) THEN
    CREATE TRIGGER trg_ot_requests_doc_no
      BEFORE INSERT ON public.tpr_ot_requests
      FOR EACH ROW
      WHEN (NEW.doc_no IS NULL)
      EXECUTE FUNCTION public.tpr_ot_requests_set_doc_no();
  END IF;
END$$;

-- G) RPC helper (fixed time casts + consistent hours/minutes)
CREATE OR REPLACE FUNCTION public.tpr_create_ot_request_draft(payload jsonb)
RETURNS SETOF public.tpr_ot_requests
LANGUAGE plpgsql
AS $$
DECLARE
  _row public.tpr_ot_requests%ROWTYPE;
  v_hours numeric;
  v_minutes integer;
  v_request_date date;
BEGIN
  v_request_date := coalesce(NULLIF(payload ->> 'request_date','')::date, current_date);
  v_hours := NULLIF(payload ->> 'hours','')::numeric;

  v_minutes :=
    COALESCE(
      NULLIF(payload ->> 'requested_minutes','')::integer,
      CASE WHEN v_hours IS NOT NULL THEN (v_hours * 60)::integer ELSE NULL END,
      0
    );

  INSERT INTO public.tpr_ot_requests(
    employee_id,
    request_date,
    work_date,
    ot_start_time,
    ot_end_time,
    requested_minutes,
    hours,
    type,
    project_id,
    reason,
    note,
    special_reason,
    attachment_url,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NULLIF(payload ->> 'employee_id','')::uuid,
    v_request_date,
    NULLIF(payload ->> 'work_date','')::date,
    NULLIF(payload ->> 'ot_start_time','')::time,
    NULLIF(payload ->> 'ot_end_time','')::time,
    v_minutes,
    (v_minutes::numeric / 60.0),
    NULLIF(payload ->> 'type','')::text,
    NULLIF(payload ->> 'project_id','')::uuid,
    (payload ->> 'reason')::text,
    (payload ->> 'note')::text,
    (payload ->> 'special_reason')::text,
    (payload ->> 'attachment_url')::text,
    COALESCE(NULLIF(payload ->> 'status','')::text, 'Draft'),
    now(),
    now()
  )
  RETURNING * INTO _row;

  RETURN QUERY SELECT * FROM public.tpr_ot_requests WHERE id = _row.id;
END;
$$;

COMMIT;
