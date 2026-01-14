-- leave requests (use existing leave_type)
CREATE TABLE IF NOT EXISTS public.tpr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,

  leave_type_id uuid NOT NULL REFERENCES public.leave_type(id),

  leave_mode text NOT NULL CHECK (leave_mode IN ('FULL_DAY','HALF_DAY','HOURLY')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,

  duration_hours numeric(6,2) NOT NULL CHECK (duration_hours > 0),
  duration_days  numeric(6,2) NOT NULL CHECK (duration_days > 0),

  half_day_slot text NULL CHECK (half_day_slot IN ('AM','PM')),
  reason text NOT NULL,
  attachment_url text NULL,

  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Submitted','Approved','Rejected','Canceled')),

  submitted_at timestamptz NULL,
  submitted_by uuid NULL,
  approved_at timestamptz NULL,
  approved_by uuid NULL,
  rejected_at timestamptz NULL,
  rejected_by uuid NULL,
  rejected_reason text NULL,
  canceled_at timestamptz NULL,
  canceled_by uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tpr_leave_requests_updated_at
BEFORE UPDATE ON public.tpr_leave_requests
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


CREATE TABLE IF NOT EXISTS public.tpr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,

  leave_type_id uuid NOT NULL REFERENCES public.leave_type(id),

  quota_hours numeric(8,2) NOT NULL DEFAULT 0,
  used_hours  numeric(8,2) NOT NULL DEFAULT 0,

  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, leave_type_id)
);

CREATE TRIGGER tpr_leave_balances_updated_at
BEFORE UPDATE ON public.tpr_leave_balances
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


