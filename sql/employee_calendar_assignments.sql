-- =========================================================
-- employee_calendar_assignments migration
-- ผูกพนักงาน ↔ ปฏิทินบริษัท (มีช่วงวันที่มีผล)
-- =========================================================

create table if not exists public.employee_calendar_assignments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  calendar_id uuid not null,

  effective_from date not null default current_date,
  effective_to date null, -- null = ใช้งานอยู่

  -- generated range สำหรับกันช่วงซ้อน
  effective_range daterange
    generated always as (
      daterange(
        effective_from,
        coalesce(effective_to, 'infinity'::date),
        '[]'
      )
    ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null
);

-- =========================================================
-- Foreign Keys
-- =========================================================

alter table public.employee_calendar_assignments
  drop constraint if exists fk_emp_cal_user;
alter table public.employee_calendar_assignments
  add constraint fk_emp_cal_user
  foreign key (user_id)
  references public.employees(id)
  on delete cascade;

alter table public.employee_calendar_assignments
  drop constraint if exists fk_emp_cal_calendar;
alter table public.employee_calendar_assignments
  add constraint fk_emp_cal_calendar
  foreign key (calendar_id)
  references public.company_calendars(id)
  on delete restrict;

-- =========================================================
-- Date range validity
-- =========================================================

alter table public.employee_calendar_assignments
  drop constraint if exists chk_emp_cal_range;
alter table public.employee_calendar_assignments
  add constraint chk_emp_cal_range
  check (
    effective_to is null
    or effective_to >= effective_from
  );

-- =========================================================
-- Prevent overlapping calendar per employee
-- (ใช้ GiST exclusion constraint)
-- =========================================================

create extension if not exists btree_gist;

alter table public.employee_calendar_assignments
  drop constraint if exists no_overlap_emp_cal;

alter table public.employee_calendar_assignments
  add constraint no_overlap_emp_cal
  exclude using gist (
    user_id with =,
    effective_range with &&
  );

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists idx_emp_cal_user_dates
  on public.employee_calendar_assignments
  (user_id, effective_from, effective_to);

create index if not exists idx_emp_cal_calendar
  on public.employee_calendar_assignments
  (calendar_id);

-- =========================================================
-- updated_at trigger
-- =========================================================

drop trigger if exists trg_emp_cal_updated_at
  on public.employee_calendar_assignments;

create trigger trg_emp_cal_updated_at
before update on public.employee_calendar_assignments
for each row
execute function set_updated_at();
