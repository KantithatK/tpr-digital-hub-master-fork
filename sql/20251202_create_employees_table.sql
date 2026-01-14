-- Migration: create employees table
-- Created: 2025-12-02

create table public.employees (
  id uuid not null default gen_random_uuid (),
  employee_code character varying(64) not null,
  image_url text null,
  timekeeping_exempt boolean null default false,
  title_th character varying(64) null,
  first_name_th character varying(200) null,
  last_name_th character varying(200) null,
  title_en character varying(64) null,
  first_name_en character varying(200) null,
  last_name_en character varying(200) null,
  nickname_th character varying(100) null,
  nickname_en character varying(100) null,
  birth_date date null,
  gender character varying(32) null,
  blood_group character varying(8) null,
  national_id character varying(32) null,
  national_id_issue_place character varying(200) null,
  national_id_issue_date date null,
  national_id_expiry_date date null,
  passport_no character varying(50) null,
  foreign_tax_id character varying(100) null,
  marital_status character varying(50) null,
  marriage_province_id bigint null,
  marriage_province_label character varying(200) null,
  marriage_district_id bigint null,
  marriage_district_label character varying(200) null,
  marriage_registration_date date null,
  spouse_age_65_plus boolean null default false,
  military_status character varying(64) null,
  military_note text null,
  driver_license_number character varying(64) null,
  driver_license_expiry date null,
  driver_license_type character varying(128) null,
  nationality_id uuid null,
  nationality character varying(200) null,
  race_id uuid null,
  race character varying(200) null,
  religion character varying(64) null,
  current_address_name character varying(200) null,
  current_address_no character varying(64) null,
  current_address_moo character varying(64) null,
  current_address_building character varying(200) null,
  current_address_room character varying(64) null,
  current_address_floor character varying(64) null,
  current_address_village character varying(200) null,
  current_address_alley character varying(200) null,
  current_address_road character varying(200) null,
  current_address_country_id uuid null,
  current_address_country character varying(200) null,
  current_address_province bigint null,
  current_address_district bigint null,
  current_address_subdistrict bigint null,
  current_address_postal_code character varying(20) null,
  current_address_mobile character varying(32) null,
  current_address_email_1 character varying(200) null,
  current_address_email_2 character varying(200) null,
  current_address_email_3 character varying(200) null,
  position_id uuid null,
  position character varying(200) null,
  department_id uuid null,
  department_name character varying(200) null,
  supervisor_name character varying(200) null,
  employee_type character varying(64) null,
  employee_group_id uuid null,
  employee_group character varying(200) null,
  employee_level_id uuid null,
  level character varying(200) null,
  start_date date null,
  probation_days integer null,
  confirmation_date date null,
  working_hours character varying(128) null,
  service_age_years integer null,
  service_age_months integer null,
  service_age_days integer null,
  employment_status character varying(128) null,
  salary_rate numeric(12, 2) null,
  salary_first_period_calc character varying(64) null,
  tax_calc_method character varying(64) null,
  tax_rate_mode character varying(32) null,
  tax_fixed_boi_percent numeric(6, 2) null,
  tax_employee_method character varying(32) null,
  tax_employee_fixed_amount numeric(12, 2) null,
  tax_employer_method character varying(32) null,
  tax_employer_fixed_amount numeric(12, 2) null,
  created_by character varying(200) null,
  created_at timestamp with time zone null default now(),
  updated_by character varying(200) null,
  updated_at timestamp with time zone null default now(),
  notify_additional_info boolean null default false,
  country character varying null,
  height_cm numeric null,
  weight_kg numeric null,
  province character varying null,
  payment_schedule_template_id uuid null,
  payment_schedule_template character varying(300) null,
  supervisor_id uuid null,
  education jsonb null default '[]'::jsonb,
  work_experiences jsonb null default '[]'::jsonb,
  constraint employees_pkey primary key (id),
  constraint employees_employee_code_key unique (employee_code),
  constraint fk_employees_current_district foreign KEY (current_address_district) references districts (id) on delete set null,
  constraint fk_employees_current_province foreign KEY (current_address_province) references provinces (id) on delete set null,
  constraint fk_employees_current_subdistrict foreign KEY (current_address_subdistrict) references sub_districts (id) on delete set null,
  constraint fk_employees_department foreign KEY (department_id) references department (id) on delete set null,
  constraint fk_employees_employee_group foreign KEY (employee_group_id) references employee_group (id) on delete set null,
  constraint fk_employees_level foreign KEY (employee_level_id) references employee_level (id) on delete set null,
  constraint fk_employees_marriage_district foreign KEY (marriage_district_id) references districts (id) on delete set null,
  constraint fk_employees_marriage_province foreign KEY (marriage_province_id) references provinces (id) on delete set null,
  constraint fk_employees_nationality_country foreign KEY (nationality_id) references country (id) on delete set null,
  constraint fk_employees_payment_schedule_template_id foreign KEY (payment_schedule_template_id) references payroll_payment_schedule_templates (id) on delete set null,
  constraint fk_employees_position foreign KEY (position_id) references positions (id) on delete set null,
  constraint fk_employees_race_country foreign KEY (race_id) references country (id) on delete set null,
  constraint fk_employees_current_country foreign KEY (current_address_country_id) references country (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_employees_employee_code on public.employees using btree (employee_code) TABLESPACE pg_default;

create index IF not exists idx_employees_national_id on public.employees using btree (national_id) TABLESPACE pg_default;

create index IF not exists idx_employees_start_date on public.employees using btree (start_date) TABLESPACE pg_default;

create index IF not exists idx_employees_position_id on public.employees using btree (position_id) TABLESPACE pg_default;

create index IF not exists idx_employees_department_id on public.employees using btree (department_id) TABLESPACE pg_default;

create index IF not exists idx_employees_employee_type on public.employees using btree (employee_type) TABLESPACE pg_default;

create index IF not exists idx_employees_payment_schedule_template_id on public.employees using btree (payment_schedule_template_id) TABLESPACE pg_default;

create index IF not exists idx_employees_education_gin on public.employees using gin (education) TABLESPACE pg_default;

create index IF not exists idx_employees_work_experiences_gin on public.employees using gin (work_experiences) TABLESPACE pg_default;

create trigger set_timestamp BEFORE
update on employees for EACH row
execute FUNCTION trg_set_timestamp ();