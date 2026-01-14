-- Fix migration: ensure `position_id` column uses UUID to match `positions.id`.
-- This script will:
-- 1) If `position_id` exists and is bigint, drop it and recreate as uuid.
-- 2) Attempt to add a foreign key to `positions(id)` if types align.
-- 3) Create the unique index if missing.

BEGIN;

DO $$
BEGIN
  -- Only act when the column exists and is bigint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'tpr_project_wbs_phase_positions' AND column_name = 'position_id' AND data_type = 'bigint'
  ) THEN
    RAISE NOTICE 'Converting position_id from bigint to uuid on tpr_project_wbs_phase_positions';
    -- Drop FK if present
    BEGIN
      ALTER TABLE tpr_project_wbs_phase_positions DROP CONSTRAINT IF EXISTS fk_position;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop fk_position: %', SQLERRM;
    END;

    -- Drop the column (this loses bigint data). If you need to preserve mappings, migrate them manually first.
    BEGIN
      ALTER TABLE tpr_project_wbs_phase_positions DROP COLUMN IF EXISTS position_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop position_id column: %', SQLERRM;
    END;

    -- Add uuid column
    BEGIN
      ALTER TABLE tpr_project_wbs_phase_positions ADD COLUMN position_id uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add position_id uuid column: %', SQLERRM;
    END;

    -- Try to add foreign key to positions(id)
    BEGIN
      ALTER TABLE tpr_project_wbs_phase_positions
        ADD CONSTRAINT fk_position
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping adding FK to positions (possible type mismatch or missing table): %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'position_id is not bigint or column missing; no conversion needed';
  END IF;
END$$;

-- Ensure unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_phase_position_unique ON tpr_project_wbs_phase_positions(phase_id, position_id);

COMMIT;

-- Note: If you need to map existing bigint ids to UUID values, perform that mapping manually before running this script.
