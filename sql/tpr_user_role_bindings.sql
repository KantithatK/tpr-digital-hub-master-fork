-- SQL migration: tpr_user_role_bindings
-- Purpose: store bindings between application users and entries in `tpr_roles` (separate from `user_roles`).
-- Run this script in Supabase SQL editor or with psql.

BEGIN;

-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a bindings table: many-to-many (user_id <-> role_id).
-- This table intentionally does NOT FK user_id to a specific users table to keep it flexible
-- (add a FK if you have a stable users table). There is a FK to tpr_roles for role_id.
CREATE TABLE IF NOT EXISTS public.tpr_user_role_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  source text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT uq_tpr_user_role UNIQUE (user_id, role_id)
);

-- Add FK to tpr_roles if that table exists and role_id is the same type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tpr_roles') THEN
    -- Only add constraint if column types look compatible
    IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='tpr_roles' AND column_name='id') = 'uuid' THEN
      BEGIN
        ALTER TABLE public.tpr_user_role_bindings
          ADD CONSTRAINT fk_tpr_user_role_bindings_role FOREIGN KEY (role_id) REFERENCES public.tpr_roles(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
  END IF;
END$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.tpr_user_role_bindings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_tpr_user_role_bindings_updated_at ON public.tpr_user_role_bindings;
CREATE TRIGGER trg_tpr_user_role_bindings_updated_at
BEFORE UPDATE ON public.tpr_user_role_bindings
FOR EACH ROW EXECUTE PROCEDURE public.tpr_user_role_bindings_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tpr_user_role_bindings_user_id ON public.tpr_user_role_bindings (user_id);
CREATE INDEX IF NOT EXISTS idx_tpr_user_role_bindings_role_id ON public.tpr_user_role_bindings (role_id);
CREATE INDEX IF NOT EXISTS idx_tpr_user_role_bindings_created_at ON public.tpr_user_role_bindings (created_at);

-- Upsert helper: inserts binding (user_id, role_id) with provided source/metadata, does nothing if already exists
-- Example: SELECT public.set_tpr_user_role_binding('user-uuid', 'role-uuid', 'ui', '{"note":"via settings"}');
CREATE OR REPLACE FUNCTION public.set_tpr_user_role_binding(
  p_user_id uuid,
  p_role_id uuid,
  p_source text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(id uuid, user_id uuid, role_id uuid, created_at timestamptz) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.tpr_user_role_bindings (user_id, role_id, source, metadata)
  VALUES (p_user_id, p_role_id, p_source, p_metadata)
  ON CONFLICT (user_id, role_id)
  DO UPDATE SET metadata = (COALESCE(public.tpr_user_role_bindings.metadata, '{}'::jsonb) || EXCLUDED.metadata),
                source = COALESCE(EXCLUDED.source, public.tpr_user_role_bindings.source),
                updated_at = now()
  RETURNING id, user_id, role_id, created_at;
END; $$;

-- Helper to remove a binding
CREATE OR REPLACE FUNCTION public.remove_tpr_user_role_binding(p_user_id uuid, p_role_id uuid)
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.tpr_user_role_bindings WHERE user_id = p_user_id AND role_id = p_role_id;
$$;

-- View for convenience: join to tpr_roles to show role labels
CREATE OR REPLACE VIEW public.v_tpr_user_role_bindings AS
SELECT b.id, b.user_id, b.role_id, r.name_th AS role_name_th, r.name_en AS role_name_en, b.source, b.metadata, b.created_at, b.updated_at
FROM public.tpr_user_role_bindings b
LEFT JOIN public.tpr_roles r ON r.id = b.role_id;

COMMIT;

-- Usage examples (run separately):
-- 1) Insert binding
-- SELECT public.set_tpr_user_role_binding('083ac2fe-b275-41c4-8825-a8c39b6361b7', '7f4a8c3e-...-role-uuid', 'ui', '{"note":"assigned via system settings"}');

-- 2) Remove binding
-- SELECT public.remove_tpr_user_role_binding('083ac2fe-b275-41c4-8825-a8c39b6361b7', '7f4a8c3e-...-role-uuid');

-- 3) Query bindings for a user
-- SELECT * FROM public.v_tpr_user_role_bindings WHERE user_id = '083ac2fe-b275-41c4-8825-a8c39b6361b7';

-- Notes:
-- - This table is separate from `user_roles`. Use this table if you need independent bindings, auditability, or multiple roles per user.
-- - If you prefer exactly one binding per user (single role), you can alter the unique constraint to be UNIQUE (user_id) and adapt the upsert accordingly.
-- - If your application uses integer role IDs (not UUIDs), convert role_id types or adapt the column types accordingly before using.
-- - If you want strict foreign key enforcement to a users table (e.g. auth.users), add an FK constraint after confirming the users table exists and types match.
