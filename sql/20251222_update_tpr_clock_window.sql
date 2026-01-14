-- 2025-12-22
-- Update tpr_clock_in / tpr_clock_out to enforce allowed clock-in/out windows (Asia/Bangkok)
-- Adds explicit time-window checks and clear exception messages consumed by the UI.

-- NOTE: Review and adjust table/column names if your schema differs.
-- Ensure old functions are removed first to allow changing return types
-- IMPORTANT: dropping functions may affect dependent objects; test in a safe environment first.
DROP FUNCTION IF EXISTS public.tpr_clock_in(uuid,text) CASCADE;
DROP FUNCTION IF EXISTS public.tpr_clock_out(uuid,text) CASCADE;

-- DROP/CREATE to ensure idempotent replace
CREATE OR REPLACE FUNCTION public.tpr_clock_in(p_user_id uuid, p_source text DEFAULT 'web')
RETURNS TABLE(id uuid, user_id uuid, work_date date, clock_in_at timestamptz, clock_out_at timestamptz, day_status text, daily_status text) AS $$
DECLARE
  v_now_time time := (now() AT TIME ZONE 'Asia/Bangkok')::time; -- current local time (Bangkok)
  v_in_start time := time '05:00';
  v_in_end   time := time '12:00';
  v_work_date date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_daily record;
BEGIN
  -- Window check: only allow clock-in between 05:00 and 12:00 Bangkok
  IF v_now_time < v_in_start OR v_now_time > v_in_end THEN
    -- Clear prefix so client can map to friendly message
    RAISE EXCEPTION 'CLOCK_IN_NOT_ALLOWED_WINDOW:05:00-12:00';
  END IF;

  -- Attempt to get today's attendance row
  SELECT * INTO v_daily
  FROM tpr_attendance_daily
  WHERE tpr_attendance_daily.user_id = p_user_id
    AND tpr_attendance_daily.work_date = v_work_date
  LIMIT 1;

  IF FOUND THEN
    -- If day already closed, deny
    IF v_daily.daily_status = 'CLOSED' THEN
      RAISE EXCEPTION 'ALREADY_CLOSED';
    END IF;

    -- If already clocked in, deny
    IF v_daily.clock_in_at IS NOT NULL THEN
      RAISE EXCEPTION 'ALREADY_CLOCKED_IN';
    END IF;

    -- Update existing row with clock_in timestamp
    UPDATE tpr_attendance_daily
    SET clock_in_at = now(),
        updated_at = now()
    WHERE id = v_daily.id;

    RETURN QUERY SELECT * FROM tpr_attendance_daily WHERE id = v_daily.id;
    RETURN;
  ELSE
    -- Insert a new row for today with clock_in
    INSERT INTO tpr_attendance_daily(user_id, work_date, clock_in_at, day_status, daily_status, created_at, updated_at)
    VALUES (p_user_id, v_work_date, now(), 'WORK', 'OPEN', now(), now())
    RETURNING id, user_id, work_date, clock_in_at, clock_out_at, day_status, daily_status INTO STRICT v_daily;

    RETURN QUERY SELECT * FROM tpr_attendance_daily WHERE id = v_daily.id;
    RETURN;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Re-raise with original message so UI can switch on prefix
  RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.tpr_clock_out(p_user_id uuid, p_source text DEFAULT 'web')
RETURNS TABLE(id uuid, user_id uuid, work_date date, clock_in_at timestamptz, clock_out_at timestamptz, day_status text, daily_status text) AS $$
DECLARE
  v_now_time time := (now() AT TIME ZONE 'Asia/Bangkok')::time; -- current local time (Bangkok)
  v_out_start time := time '12:00';
  v_out_end   time := time '23:59';
  v_work_date date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_daily record;
BEGIN
  -- Window check: only allow clock-out between 12:00 and 23:59 Bangkok
  IF v_now_time < v_out_start OR v_now_time > v_out_end THEN
    RAISE EXCEPTION 'CLOCK_OUT_NOT_ALLOWED_WINDOW:12:00-23:59';
  END IF;

  -- Load today's attendance row
  SELECT * INTO v_daily
  FROM tpr_attendance_daily
  WHERE tpr_attendance_daily.user_id = p_user_id
    AND tpr_attendance_daily.work_date = v_work_date
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_DAILY_RECORD';
  END IF;

  -- Ensure there is a clock-in before clock-out
  IF v_daily.clock_in_at IS NULL THEN
    RAISE EXCEPTION 'NO_CLOCK_IN';
  END IF;

  -- Guard: clock-out must be after clock-in
  IF (now() <= v_daily.clock_in_at) THEN
    RAISE EXCEPTION 'CLOCK_OUT_BEFORE_CLOCK_IN';
  END IF;

  -- If already clocked out or day closed, deny
  IF v_daily.clock_out_at IS NOT NULL OR v_daily.daily_status = 'CLOSED' THEN
    RAISE EXCEPTION 'ALREADY_CLOSED_OR_CLOCKED_OUT';
  END IF;

  -- Update clock_out and close the day
  UPDATE tpr_attendance_daily
  SET clock_out_at = now(),
      daily_status = 'CLOSED',
      updated_at = now()
  WHERE id = v_daily.id;

  RETURN QUERY SELECT * FROM tpr_attendance_daily WHERE id = v_daily.id;
  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- End of script
