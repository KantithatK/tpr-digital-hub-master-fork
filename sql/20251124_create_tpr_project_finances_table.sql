-- Migration: create tpr_project_finances
-- Ensure pgcrypto is enabled for gen_random_uuid(), or use uuid-ossp and uuid_generate_v4()
-- Run: psql -h <host> -U <user> -d <db> -f sql/20251124_create_tpr_project_finances_table.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.tpr_project_finances (
  id uuid not null default gen_random_uuid(),
  project_id uuid null,
  contract_type text null,
  contract_value numeric(14, 2) null,
  fees_budget numeric(14, 2) null,
  consultants_budget numeric(14, 2) null,
  expenses_budget numeric(14, 2) null,
  labor_cost numeric(14, 2) null,
  billing_cycle text null,
  credit_days integer null,
  memo text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint tpr_project_finances_pkey primary key (id),
  constraint tpr_project_finances_project_id_fkey foreign key (project_id) references tpr_projects (id) on delete cascade
) TABLESPACE pg_default;
