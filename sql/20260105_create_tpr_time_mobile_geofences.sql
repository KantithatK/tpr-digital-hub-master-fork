-- Ensure necessary extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- Create geofence table for mobile time attendance
create table if not exists public.tpr_time_mobile_geofences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location geography(point, 4326) not null,
  radius_m integer not null default 50 check (radius_m > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references public.employees(id) on delete set null,
  updated_by uuid null references public.employees(id) on delete set null
);

create index if not exists idx_tpr_time_mobile_geofences_location
  on public.tpr_time_mobile_geofences
  using gist (location);

create index if not exists idx_tpr_time_mobile_geofences_active
  on public.tpr_time_mobile_geofences (is_active);

-- Trigger to update updated_at (expects set_updated_at() exists)
drop trigger if exists trg_tpr_time_mobile_geofences_updated_at on public.tpr_time_mobile_geofences;
create trigger trg_tpr_time_mobile_geofences_updated_at
before update on public.tpr_time_mobile_geofences
for each row execute function set_updated_at();

-- Alter attendance table to add geofence/audit fields
alter table public.tpr_attendance_daily
  add column if not exists clock_in_lat double precision null,
  add column if not exists clock_in_lng double precision null,
  add column if not exists clock_in_accuracy_m double precision null,
  add column if not exists clock_in_geofence_id uuid null
    references public.tpr_time_mobile_geofences(id) on delete set null,
  add column if not exists clock_in_distance_m double precision null,
  add column if not exists clock_in_geofence_ok boolean null,

  add column if not exists clock_out_lat double precision null,
  add column if not exists clock_out_lng double precision null,
  add column if not exists clock_out_accuracy_m double precision null,
  add column if not exists clock_out_distance_m double precision null,
  add column if not exists clock_out_geofence_ok boolean null;

-- RPC: check mobile geofence for given lat/lng
create or replace function public.tpr_check_mobile_geofence(
  p_lat double precision,
  p_lng double precision
)
returns table (
  ok boolean,
  geofence_id uuid,
  geofence_name text,
  distance_m double precision,
  radius_m integer
)
language sql
stable
as $$
  with me as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  ),
  candidates as (
    select
      g.id,
      g.name,
      g.radius_m,
      st_distance(g.location, me.g) as dist
    from public.tpr_time_mobile_geofences g
    cross join me
    where g.is_active = true
  )
  select
    (c.dist <= c.radius_m) as ok,
    c.id as geofence_id,
    c.name as geofence_name,
    c.dist as distance_m,
    c.radius_m
  from candidates c
  order by c.dist asc
  limit 1;
$$;

-- Seed at least one location
insert into public.tpr_time_mobile_geofences (name, location, radius_m, is_active)
values (
  'สำนักงานใหญ่',
  st_setsrid(st_makepoint(100.6355562, 13.834232), 4326)::geography,
  80,
  true
)
on conflict do nothing;
