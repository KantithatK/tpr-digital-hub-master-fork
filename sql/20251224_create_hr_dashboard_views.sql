-- =========================================================
-- HR Dashboard Views (DROP + CREATE)
-- Fix for: ERROR 42P16 cannot drop columns from view
-- Timezone: Asia/Bangkok
-- =========================================================

BEGIN;

-- 0) Drop dependent views first (reverse dependency order)
DROP VIEW IF EXISTS public.v_hr_kpis;
DROP VIEW IF EXISTS public.v_hr_payroll_monthly_summary;
DROP VIEW IF EXISTS public.v_hr_leave_today;
DROP VIEW IF EXISTS public.v_hr_attendance_exceptions_today;
DROP VIEW IF EXISTS public.v_hr_pending_approvals;

-- 1) v_hr_pending_approvals: unified pending approvals (status = 'Submitted')
CREATE VIEW public.v_hr_pending_approvals AS
SELECT
  'OT'::text AS req_kind,
  id,
  coalesce(user_id, employee_id) AS user_id,
  doc_no,
  status,
  updated_at,
  submitted_at,
  CASE
    WHEN work_date IS NOT NULL AND ot_start_time IS NOT NULL AND ot_end_time IS NOT NULL THEN
      to_char((work_date::timestamp + ot_start_time), 'DD/MM HH24:MI')
      || ' → ' || to_char((work_date::timestamp + ot_end_time), 'HH24:MI')
    WHEN work_date IS NOT NULL THEN to_char(work_date, 'DD/MM')
    ELSE NULL
  END AS req_time_range,
  reason,
  note
FROM public.tpr_ot_requests
WHERE status = 'Submitted'

UNION ALL

SELECT
  'LEAVE'::text AS req_kind,
  id,
  user_id,
  doc_no,
  status,
  updated_at,
  submitted_at,
  CASE
    WHEN start_at IS NOT NULL AND end_at IS NOT NULL THEN
      (CASE
        WHEN date_trunc('day', start_at) = start_at AND date_trunc('day', end_at) = end_at
          THEN to_char((start_at AT TIME ZONE 'Asia/Bangkok')::date, 'DD/MM')
               || '–' ||
               to_char((end_at   AT TIME ZONE 'Asia/Bangkok')::date, 'DD/MM')
        ELSE to_char(start_at AT TIME ZONE 'Asia/Bangkok', 'DD/MM HH24:MI')
             || ' – ' ||
             to_char(end_at   AT TIME ZONE 'Asia/Bangkok', 'DD/MM HH24:MI')
      END)
    ELSE NULL
  END AS req_time_range,
  reason,
  NULL::text AS note
FROM public.tpr_leave_requests
WHERE status = 'Submitted'

UNION ALL

SELECT
  'REP'::text AS req_kind,
  id,
  user_id,
  doc_no,
  status,
  updated_at,
  submitted_at,
  CASE
    WHEN requested_clock_in_at IS NOT NULL OR requested_clock_out_at IS NOT NULL THEN
      coalesce(to_char(requested_clock_in_at  AT TIME ZONE 'Asia/Bangkok', 'HH24:MI'), '-')
      || ' → ' ||
      coalesce(to_char(requested_clock_out_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI'), '-')
    ELSE NULL
  END AS req_time_range,
  reason,
  note
FROM public.tpr_attendance_corrections
WHERE status = 'Submitted';

-- 2) v_hr_attendance_exceptions_today: exceptions for today
CREATE VIEW public.v_hr_attendance_exceptions_today AS
SELECT
  user_id,
  work_date,
  CASE
    WHEN clock_in_at IS NULL AND clock_out_at IS NULL THEN 'MISSING_IN_OUT'
    WHEN clock_in_at IS NULL THEN 'MISSING_IN'
    WHEN clock_out_at IS NULL THEN 'MISSING_OUT'
    WHEN (clock_out_at - clock_in_at) > interval '12 hours' THEN 'LONG_HOURS'
    ELSE 'OK'
  END AS issue,
  daily_status,
  clock_in_at,
  clock_out_at
FROM public.tpr_attendance_daily
WHERE day_status = 'WORK'
  AND work_date = (now() AT TIME ZONE 'Asia/Bangkok')::date;

-- 3) v_hr_leave_today: employees on leave today (Submitted or Approved)
CREATE VIEW public.v_hr_leave_today AS
SELECT
  user_id,
  start_at,
  end_at,
  status
FROM public.tpr_leave_requests
WHERE ((start_at AT TIME ZONE 'Asia/Bangkok')::date <= (now() AT TIME ZONE 'Asia/Bangkok')::date)
  AND ((end_at   AT TIME ZONE 'Asia/Bangkok')::date >= (now() AT TIME ZONE 'Asia/Bangkok')::date)
  AND status IN ('Approved','Submitted')
ORDER BY start_at DESC;

-- 4) v_hr_kpis: aggregated single-row KPIs
CREATE VIEW public.v_hr_kpis AS
SELECT
  (SELECT count(*) FROM public.tpr_ot_requests WHERE status = 'Submitted')::int AS pending_ot_count,
  (SELECT count(*) FROM public.tpr_leave_requests WHERE status = 'Submitted')::int AS pending_leave_count,
  (SELECT count(*) FROM public.tpr_attendance_corrections WHERE status = 'Submitted')::int AS pending_rep_count,
  (SELECT count(*) FROM public.v_hr_attendance_exceptions_today WHERE issue IN ('MISSING_IN','MISSING_IN_OUT'))::int AS missing_in_count,
  (SELECT count(*) FROM public.v_hr_attendance_exceptions_today WHERE issue IN ('MISSING_OUT','MISSING_IN_OUT'))::int AS missing_out_count,
  (SELECT count(*) FROM public.v_hr_attendance_exceptions_today WHERE issue = 'LONG_HOURS')::int AS long_hours_count;

-- 5) v_hr_payroll_monthly_summary: approved hours for current month
CREATE VIEW public.v_hr_payroll_monthly_summary AS
WITH month_bounds AS (
  SELECT
    date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok')::date AS month_start,
    (date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') + interval '1 month')::date AS month_end
)
SELECT
  mb.month_start,
  mb.month_end,

  -- OT approved hours: prefer "hours" column if it is maintained correctly; fallback to time diff if needed
  COALESCE(
    (SELECT SUM(COALESCE(hours, 0)) FROM public.tpr_ot_requests r
     WHERE r.status = 'Approved'
       AND r.work_date >= mb.month_start AND r.work_date < mb.month_end),
    0
  )::numeric AS approved_ot_hours,

  -- Leave approved hours: use duration_hours (already stored)
  COALESCE(
    (SELECT SUM(duration_hours) FROM public.tpr_leave_requests lr
     WHERE lr.status = 'Approved'
       AND (lr.start_at AT TIME ZONE 'Asia/Bangkok')::date < mb.month_end
       AND (lr.end_at   AT TIME ZONE 'Asia/Bangkok')::date >= mb.month_start),
    0
  )::numeric AS approved_leave_hours,

  -- Regular hours: best effort from attendance daily (clock_out - clock_in) in month
  COALESCE(
    (SELECT SUM(EXTRACT(EPOCH FROM (ad.clock_out_at - ad.clock_in_at))/3600.0)
     FROM public.tpr_attendance_daily ad
     WHERE ad.day_status = 'WORK'
       AND ad.clock_in_at IS NOT NULL AND ad.clock_out_at IS NOT NULL
       AND ad.work_date >= mb.month_start AND ad.work_date < mb.month_end),
    0
  )::numeric AS approved_regular_hours

FROM month_bounds mb
LIMIT 1;

COMMIT;
