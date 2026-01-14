-- SQL DDL: create_email_templates_table.sql
-- Purpose: Create table to store email template definitions used by the HRM frontend
-- Notes: Designed to match fields used in `src/hrm/modules/settings/email-templates.jsx`

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: public.email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code varchar(50) NOT NULL,
  template_name_th varchar(200) NOT NULL,
  template_name_en varchar(200),
  category varchar(100) DEFAULT 'System Group',
  subject_th varchar(255),
  subject_en varchar(255),
  include_data_label boolean DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate template_code
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_template_code_key ON public.email_templates (template_code);

-- Trigger function to keep updated_at current
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger: before insert or update
DROP TRIGGER IF EXISTS set_timestamp ON public.email_templates;
CREATE TRIGGER set_timestamp
BEFORE INSERT OR UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Helpful indexes for searching by name
CREATE INDEX IF NOT EXISTS email_templates_name_th_idx ON public.email_templates (lower(template_name_th));
CREATE INDEX IF NOT EXISTS email_templates_name_en_idx ON public.email_templates (lower(template_name_en));

-- Example seed rows (uncomment to insert sample data)
-- INSERT INTO public.email_templates (template_code, template_name_th, template_name_en, category, subject_th, subject_en, include_data_label, description)
-- VALUES
-- ('sysHRMI-003', 'อีเมลแจ้งผลการไม่อนุมัติเอกสาร', 'E-mail Notify Result of Not Approved Document', 'System Group', 'แจ้งผลการไม่อนุมัติเอกสาร', 'Notify Not Approved Document', true, 'เป็นกลุ่มของ template สำหรับการส่งอีเมลแจ้งผลการไม่อนุมัติเอกสาร');

-- Row Level Security (RLS) examples (OPTIONAL)
-- If you enable RLS you will need to create policies. Example policies below are templates to adapt for your environment.
-- NOTE: Supabase projects often enable RLS; adjust policies to your auth model.
--
-- ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
--
-- -- Allow authenticated users to SELECT
-- CREATE POLICY select_authenticated ON public.email_templates
--   FOR SELECT USING (auth.role() = 'authenticated');
--
-- -- Allow authenticated users to INSERT (you might want to restrict to admin users)
-- CREATE POLICY insert_authenticated ON public.email_templates
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
--
-- -- Allow update/delete only for admin roles (example uses a custom claim `is_admin`)
-- CREATE POLICY update_admin ON public.email_templates
--   FOR UPDATE USING (current_setting('request.jwt.claims.is_admin', true) = 'true');
--
-- CREATE POLICY delete_admin ON public.email_templates
--   FOR DELETE USING (current_setting('request.jwt.claims.is_admin', true) = 'true');

-- Grants (adjust for your DB user/groups)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO public;
