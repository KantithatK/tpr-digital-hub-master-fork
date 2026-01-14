-- Workstreams and WBS schema
-- Create table: tpr_workstreams
CREATE TABLE IF NOT EXISTS tpr_workstreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  owner uuid,
  team_department text,
  budget_amount numeric(18,2) DEFAULT 0,
  planned_hours numeric(12,2) DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'Planning',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_project ON tpr_workstreams(project_id);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_code ON tpr_workstreams(code);

-- Add workstream_id to WBS tables
ALTER TABLE IF EXISTS tpr_project_wbs_phases
  ADD COLUMN IF NOT EXISTS workstream_id uuid;

ALTER TABLE IF EXISTS tpr_project_wbs_tasks
  ADD COLUMN IF NOT EXISTS workstream_id uuid;

-- Optional FK constraints (comment out if not ready)
-- ALTER TABLE tpr_project_wbs_phases
--   ADD CONSTRAINT fk_phase_workstream FOREIGN KEY (workstream_id) REFERENCES tpr_workstreams(id) ON DELETE CASCADE;
-- ALTER TABLE tpr_project_wbs_tasks
--   ADD CONSTRAINT fk_task_workstream FOREIGN KEY (workstream_id) REFERENCES tpr_workstreams(id) ON DELETE CASCADE;

-- Views or helper queries can be added later.
