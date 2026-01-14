-- Migration: create project teams table
-- Created: 2025-11-26

CREATE TABLE IF NOT EXISTS public.tpr_project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code text NOT NULL UNIQUE,
  team_name text NOT NULL,
  department_id uuid NULL,
  team_lead_id uuid NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_at timestamptz NULL,
  updated_by uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_tpr_project_teams_department_id ON public.tpr_project_teams (department_id);
CREATE INDEX IF NOT EXISTS idx_tpr_project_teams_team_code ON public.tpr_project_teams (team_code);

-- NOTE: Add FK constraints to departments and employees tables if/when ready in a follow-up migration.
