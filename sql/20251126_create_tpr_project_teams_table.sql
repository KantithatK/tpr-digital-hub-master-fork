-- Migration: create tpr_project_teams
-- Date: 2025-11-26

-- This migration creates the tpr_project_teams table used by the frontend
-- for managing project teams. It's intentionally conservative about foreign
-- key constraints: department_id and team_lead_id reference likely tables
-- but are left as nullable UUID columns to avoid failing if the referenced
-- tables don't exist in all environments. Add FK constraints later if desired.

-- Recommended: run this on a development database first.

CREATE TABLE IF NOT EXISTS public.tpr_project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code varchar(64) NOT NULL,
  team_name varchar(255) NOT NULL,
  -- department removed: teams can link to multiple positions instead
  team_lead_id uuid NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NULL,
  updated_at timestamptz NULL,
  updated_by text NULL
);

-- Unique index on team_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_tpr_project_teams_team_code ON public.tpr_project_teams (lower(team_code));

-- Join table for team <-> positions (many-to-many)
CREATE TABLE IF NOT EXISTS public.tpr_project_team_positions (
  team_id uuid NOT NULL,
  position_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, position_id)
);

-- FK to teams (cascade delete)
ALTER TABLE IF EXISTS public.tpr_project_team_positions
  ADD CONSTRAINT fk_tpr_project_team_positions_team FOREIGN KEY (team_id) REFERENCES public.tpr_project_teams(id) ON DELETE CASCADE;

-- Optional: add foreign keys if your environment has these tables
-- ALTER TABLE public.tpr_project_teams
--   ADD CONSTRAINT fk_tpr_project_teams_department FOREIGN KEY (department_id) REFERENCES public.tpr_units(id) ON DELETE SET NULL;
-- ALTER TABLE public.tpr_project_teams
--   ADD CONSTRAINT fk_tpr_project_teams_lead FOREIGN KEY (team_lead_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- Notes:
-- - gen_random_uuid() requires the pgcrypto extension. If your DB uses uuid_generate_v4(), replace accordingly.
-- - created_by / updated_by stored as text (email or user id) for flexibility.
