-- Migration: create join table to map WBS phases to position ids (multi-owner)
-- This migration will:
-- 1) Create table `tpr_project_wbs_phase_positions(phase_id, position_id)` with FKs
-- 2) Attempt to migrate existing values from `tpr_project_wbs_phases.owner` into the join table
--    by matching owner labels to `positions.position_name` or `positions.position_code`.
-- Notes:
-- - If your `positions.id` or `tpr_project_wbs_phases.id` types are not integers, adjust the column types accordingly before running.
-- - This migration only inserts mappings when a matching position is found. Unmatched owner labels remain in `tpr_project_wbs_phases.owner`.

BEGIN;

-- 1) Create the join table
CREATE TABLE IF NOT EXISTS tpr_project_wbs_phase_positions (
  id bigserial PRIMARY KEY,
  phase_id bigint NOT NULL,
  position_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign keys if referenced tables use compatible types. If types mismatch, skip or adjust accordingly.
DO $$
BEGIN
  -- Add FK to phases if column types match
  BEGIN
    ALTER TABLE tpr_project_wbs_phase_positions
      ADD CONSTRAINT fk_phase
      FOREIGN KEY (phase_id) REFERENCES tpr_project_wbs_phases(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table OR undefined_column OR duplicate_object THEN
    RAISE NOTICE 'Skipping adding FK to tpr_project_wbs_phases (possible type mismatch).';
  END;

  -- Add FK to positions if column types match
  BEGIN
    ALTER TABLE tpr_project_wbs_phase_positions
      ADD CONSTRAINT fk_position
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT;
  EXCEPTION WHEN undefined_table OR undefined_column OR duplicate_object THEN
    RAISE NOTICE 'Skipping adding FK to positions (possible type mismatch).';
  END;
END$$;

-- 2) Migrate existing owner values into the join table where we can match them to positions
-- Support both JSON-array ("[...]") and comma-separated owner strings

WITH phase_owners AS (
  SELECT
    id AS phase_id,
    CASE
      WHEN owner IS NULL THEN NULL
      WHEN trim(owner) LIKE '[%' THEN (
        SELECT array_agg(trim(both '"' from value))
        FROM jsonb_array_elements_text(owner::jsonb) AS value
      )
      ELSE string_to_array(owner, ',')
    END AS owner_arr
  FROM tpr_project_wbs_phases
  WHERE owner IS NOT NULL
), exploded AS (
  SELECT phase_id, trim(o) AS owner_label
  FROM phase_owners, unnest(owner_arr) AS o
  WHERE owner_arr IS NOT NULL
), matched AS (
  SELECT e.phase_id, pos.id AS position_id
  FROM exploded e
  JOIN positions pos ON (pos.position_name = e.owner_label OR pos.position_code = e.owner_label)
)
INSERT INTO tpr_project_wbs_phase_positions(phase_id, position_id)
SELECT DISTINCT phase_id, position_id FROM matched
ON CONFLICT DO NOTHING;

-- Add a unique index to prevent duplicate mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_phase_position_unique ON tpr_project_wbs_phase_positions(phase_id, position_id);

COMMIT;

-- Rollback: DROP TABLE tpr_project_wbs_phase_positions; (reverse migration if required)
