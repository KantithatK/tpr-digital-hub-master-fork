-- View: public.v_employee_users_with_roles
-- Purpose: Map authenticated users (auth.users) by email to role bindings
-- and roles in tpr_user_role_bindings / tpr_roles. Also include basic
-- employee info (if any) by matching employee email.

-- Drop existing view if present so the script is idempotent
drop view if exists public.v_employee_users_with_roles cascade;

create view public.v_employee_users_with_roles as
select
  u.id::text as auth_user_id,
  lower(u.email) as email,
  u.created_at as auth_created_at,

  b.id::text as binding_id,
  b.role_id::text as role_id,
  r.name_th as role_name_th,
  r.name_en as role_name_en,
  coalesce(nullif(r.name_th, ''), nullif(r.name_en, ''), 'ยังไม่กำหนดสิทธิ์') as role_label,
  b.created_at as binding_created_at,
  b.updated_at as binding_updated_at,

  -- employee info (if an employee with the same email exists)
  e.id::text as employee_id,
  e.employee_code,
  e.title_th,
  e.first_name_th,
  e.last_name_th,
  e.current_address_email_1 as employee_email

from auth.users u
left join public.tpr_user_role_bindings b
  on lower(b.email) = lower(u.email)
left join public.tpr_roles r
  on r.id = b.role_id
left join public.employees e
  on lower(coalesce(e.current_address_email_1, '')) = lower(u.email)
;

comment on view public.v_employee_users_with_roles is
  'View mapping auth.users (by email) to public.tpr_user_role_bindings and public.tpr_roles. Includes employee info when available. role_label falls back to Thai/English name or Thai text "ยังไม่กำหนดสิทธิ์".';

-- Notes:
-- - Run this in the Supabase SQL editor or via psql against your database.
-- - If your auth.users table is in a different schema/name, adjust the FROM clause.
-- - This view uses case-insensitive email matching with LOWER(); ensure stored emails are normalized if you require stricter behavior.
