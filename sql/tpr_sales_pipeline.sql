-- =========================================================
-- TPR Sales Pipeline Schema
-- File: tpr_sales_pipeline.sql
-- Purpose: Sales Pipeline / Opportunities / Activities
-- Depends on: public.tpr_customers
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;

-- =========================================================
-- 1) Opportunities
-- =========================================================
create table if not exists public.tpr_opportunities (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null
    references public.tpr_customers(id)
    on delete restrict,

  project_name text not null,

  estimated_value numeric(18,2) not null default 0,
  probability int not null default 15
    check (probability between 0 and 100),

  status text not null
    check (status in (
      'Lead',
      'Prospecting',
      'Proposal Sent',
      'Negotiation',
      'Won',
      'Lost'
    )),

  deadline_date date null,
  follow_up_date date null,

  assigned_to uuid null,
  notes text null,

  created_at timestamptz not null default now(),
  created_by uuid null,
  updated_at timestamptz not null default now(),
  updated_by uuid null,

  closed_at timestamptz null,
  lost_reason text null,

  metadata jsonb not null default '{}'::jsonb
);

-- ---------- Indexes ----------
create index if not exists idx_tpr_opp_status
  on public.tpr_opportunities(status);

create index if not exists idx_tpr_opp_deadline
  on public.tpr_opportunities(deadline_date);

create index if not exists idx_tpr_opp_follow_up
  on public.tpr_opportunities(follow_up_date);

create index if not exists idx_tpr_opp_customer
  on public.tpr_opportunities(customer_id);

create index if not exists idx_tpr_opp_created_at
  on public.tpr_opportunities(created_at desc);

-- =========================================================
-- 2) Constraint: Proposal Sent ต้องมี follow_up_date
-- =========================================================
alter table public.tpr_opportunities
drop constraint if exists chk_tpr_opp_proposal_followup;

alter table public.tpr_opportunities
add constraint chk_tpr_opp_proposal_followup
check (
  status <> 'Proposal Sent'
  or follow_up_date is not null
);

-- =========================================================
-- 3) Trigger: updated_at (ใช้ function เดิมของคุณ)
-- =========================================================
drop trigger if exists trg_tpr_opportunities_updated_at
  on public.tpr_opportunities;

create trigger trg_tpr_opportunities_updated_at
before update on public.tpr_opportunities
for each row
execute function public.tpr_set_updated_at();

-- =========================================================
-- 4) Trigger: closed_at เมื่อ Won / Lost
-- =========================================================
create or replace function public.tpr_opportunity_set_closed_at()
returns trigger as $$
begin
  if new.status in ('Won','Lost') and new.closed_at is null then
    new.closed_at := now();
  end if;

  if new.status not in ('Won','Lost') then
    new.closed_at := null;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tpr_opportunities_closed_at
  on public.tpr_opportunities;

create trigger trg_tpr_opportunities_closed_at
before insert or update of status on public.tpr_opportunities
for each row
execute function public.tpr_opportunity_set_closed_at();

-- =========================================================
-- 5) Customer Activities (Key Client Activity / Timeline)
-- =========================================================
create table if not exists public.tpr_customer_activities (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null
    references public.tpr_customers(id)
    on delete cascade,

  opportunity_id uuid null
    references public.tpr_opportunities(id)
    on delete set null,

  activity_type text not null,
  activity_description text not null,
  activity_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  created_by uuid null,

  metadata jsonb not null default '{}'::jsonb
);

-- ---------- Indexes ----------
create index if not exists idx_tpr_act_customer
  on public.tpr_customer_activities(customer_id, activity_at desc);

create index if not exists idx_tpr_act_opp
  on public.tpr_customer_activities(opportunity_id, activity_at desc);

create index if not exists idx_tpr_act_created_at
  on public.tpr_customer_activities(created_at desc);

-- =========================================================
-- END OF FILE
-- =========================================================
