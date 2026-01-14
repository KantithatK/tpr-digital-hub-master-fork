-- Safe migration: create/ensure normalized join table for WBS phase -> positions
-- Behavior:
-- 1) Create table `tpr_project_wbs_phase_positions` with `phase_id bigint` and `position_id uuid` if missing.
-- 2) Add FKs when possible (skips with NOTICE if types mismatch).
-- 3) Migrate owner labels from `tpr_project_wbs_phases.owner` into the join table by matching
--    to `positions.position_name` or `positions.position_code`.
-- 4) Attempt to import any existing rows from a prior partial table if they are UUID-compatible.
-- This script is idempotent and safe to re-run. Back up your DB before running in production.

BEGIN;

-- 1) Create the table if it doesn't exist (use correct column types)
CREATE TABLE IF NOT EXISTS public.tpr_project_wbs_phase_positions (
  id bigserial PRIMARY KEY,
  phase_id bigint NOT NULL,
  position_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2) Try to add foreign keys (best-effort; will skip if types/tables don't match)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.tpr_project_wbs_phase_positions
      ADD CONSTRAINT fk_phase_wbs_phases
      FOREIGN KEY (phase_id) REFERENCES public.tpr_project_wbs_phases(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table OR undefined_column OR duplicate_object THEN
    RAISE NOTICE 'Skipping FK fk_phase_wbs_phases; phases table/column may not exist or constraint already present.';
  END;

  BEGIN
    ALTER TABLE public.tpr_project_wbs_phase_positions
      ADD CONSTRAINT fk_position_positions
      FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE RESTRICT;
  EXCEPTION WHEN undefined_table OR undefined_column OR duplicate_object THEN
    RAISE NOTICE 'Skipping FK fk_position_positions; positions table/column may not exist or constraint already present.';
  END;
END$$;

-- 3) Migrate owner labels (JSON arrays or comma-separated strings) into the join table
--    Match by position_name or position_code
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
  FROM public.tpr_project_wbs_phases
  WHERE owner IS NOT NULL
), exploded AS (
  SELECT phase_id, trim(o) AS owner_label
  FROM phase_owners, unnest(owner_arr) AS o
  WHERE owner_arr IS NOT NULL
), matched AS (
  SELECT DISTINCT e.phase_id, pos.id::uuid AS position_id
  FROM exploded e
  JOIN public.positions pos ON (pos.position_name = e.owner_label OR pos.position_code = e.owner_label)
)
INSERT INTO public.tpr_project_wbs_phase_positions(phase_id, position_id)
SELECT phase_id, position_id FROM matched
ON CONFLICT DO NOTHING;

-- 4) Attempt to import any existing rows from an earlier-created table that may have
--    position_id stored as text or uuid-compatible values.
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tpr_project_wbs_phase_positions' AND column_name = 'position_id';

  IF col_type IS NOT NULL AND col_type <> 'uuid' THEN
    -- There is a position_id column but not uuid; attempt to copy uuid-like values
    RAISE NOTICE 'Existing position_id column type is % - attempting to import uuid-like values into normalized table.', col_type;
    -- Insert rows where the existing position_id text looks like a UUID
    BEGIN
      INSERT INTO public.tpr_project_wbs_phase_positions(phase_id, position_id)
      SELECT phase_id, (position_id::text)::uuid
      FROM public.tpr_project_wbs_phase_positions
      WHERE position_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not import old rows by casting to uuid: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'position_id column is uuid or missing; no import-from-old-table step needed.';
  END IF;
END$$;

-- Ensure unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_phase_position_unique ON public.tpr_project_wbs_phase_positions(phase_id, position_id);

COMMIT;

-- Notes:
-- - This script focuses on creating the normalized join table and migrating owner labels
--   (from the phases.owner column) into mappings where a positions match exists.
-- - If you have important rows in an earlier partially-created table with non-UUID
--   position_id values (numeric IDs), preserve a backup of that table before running
--   any destructive operations; mapping numeric IDs to UUIDs requires a mapping step
--   against your `positions` table and cannot be guessed automatically.
