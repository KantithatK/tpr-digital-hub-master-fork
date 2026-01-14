-- SQL: create_employees_table.sql
-- Supabase / PostgreSQL DDL to store employee data and related small tables
-- Adjust FK target table/column names if your schema differs.

-- Use pgcrypto for gen_random_uuid(); if your DB uses uuid-ossp change accordingly
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Main employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code varchar(64) NOT NULL UNIQUE,
  image_url text,
  timekeeping_exempt boolean DEFAULT false,

  -- names and titles
  title_th varchar(64),
  first_name_th varchar(200),
  last_name_th varchar(200),
  title_en varchar(64),
  first_name_en varchar(200),
  last_name_en varchar(200),
  nickname_th varchar(100),
  nickname_en varchar(100),

  -- personal
  birth_date date,
  gender varchar(32),
  blood_group varchar(8),

  -- national id / passport / tax
  national_id varchar(32),
  national_id_issue_place varchar(200),
  national_id_issue_date date,
  national_id_expiry_date date,
  passport_no varchar(50),
  foreign_tax_id varchar(100),

  -- marital / spouse
  marital_status varchar(50),
  marriage_province_id bigint,
  marriage_province_label varchar(200),
  marriage_district_id bigint,
  marriage_district_label varchar(200),
  marriage_registration_date date,
  spouse_age_65_plus boolean DEFAULT false,

  -- military
  military_status varchar(64),
  military_note text,

  -- driver license
  driver_license_number varchar(64),
  driver_license_expiry date,
  driver_license_type varchar(128),

  -- nationality / race / religion
  nationality_id uuid,
  nationality varchar(200),
  race_id uuid,
  race varchar(200),
  religion varchar(64),

  -- address (current)
  current_address_name varchar(200),
  current_address_no varchar(64),
  current_address_moo varchar(64),
  current_address_building varchar(200),
  current_address_room varchar(64),
  current_address_floor varchar(64),
  current_address_village varchar(200),
  current_address_alley varchar(200),
  current_address_road varchar(200),
  current_address_country_id uuid,
  current_address_country varchar(200),
  current_address_province bigint,
  current_address_district bigint,
  current_address_subdistrict bigint,
  current_address_postal_code varchar(20),
  current_address_mobile varchar(32),
  current_address_email_1 varchar(200),
  current_address_email_2 varchar(200),
  current_address_email_3 varchar(200),

  -- hiring / work
  position_id uuid,
  position varchar(200), -- denormalized display value (optional)
  department_id uuid,
  unit varchar(200), -- denormalized display value (optional)
  supervisor varchar(200), -- could be employee id in future
  employee_type varchar(64),
  employee_group_id uuid,
  employee_group varchar(200),
  employee_level_id uuid,
  level varchar(200),
  start_date date,
  probation_days integer,
  confirmation_date date,
  working_hours varchar(128),
  service_age_years integer,
  service_age_months integer,
  service_age_days integer,
  employment_status varchar(128),
  salary_rate numeric(12,2),

  -- payment / tax (simplified)
  salary_first_period_calc varchar(64),
  -- payment schedule template selected for this employee (optional)
  payment_schedule_template_id uuid,
  payment_schedule_template varchar(300),
  tax_calc_method varchar(64),
  tax_rate_mode varchar(32),
  tax_fixed_boi_percent numeric(6,2),
  tax_employee_method varchar(32),
  tax_employee_fixed_amount numeric(12,2),
  tax_employer_method varchar(32),
  tax_employer_fixed_amount numeric(12,2),

  -- audit
  created_by varchar(200),
  created_at timestamptz DEFAULT now(),
  updated_by varchar(200),
  updated_at timestamptz DEFAULT now(),

  -- misc
  notify_additional_info boolean DEFAULT false
);

-- Foreign keys (optional) - set to NULL on delete of referenced rows to preserve employee record
-- Please adjust target table names (`country`, `provinces`, `districts`, `sub_districts`, `positions`, `employee_group`, `employee_level`, `user_group`) if they are different in your DB.
ALTER TABLE employees
  ADD CONSTRAINT fk_employees_nationality_country FOREIGN KEY (nationality_id) REFERENCES country(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_race_country FOREIGN KEY (race_id) REFERENCES country(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_current_country FOREIGN KEY (current_address_country_id) REFERENCES country(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_marriage_province FOREIGN KEY (marriage_province_id) REFERENCES provinces(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_marriage_district FOREIGN KEY (marriage_district_id) REFERENCES districts(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_current_province FOREIGN KEY (current_address_province) REFERENCES provinces(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_current_district FOREIGN KEY (current_address_district) REFERENCES districts(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_current_subdistrict FOREIGN KEY (current_address_subdistrict) REFERENCES sub_districts(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_employee_group FOREIGN KEY (employee_group_id) REFERENCES employee_group(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_level FOREIGN KEY (employee_level_id) REFERENCES employee_level(id) ON DELETE SET NULL;

-- optionally reference the payment schedule template table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payroll_payment_schedule_templates') THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_payment_schedule_template FOREIGN KEY (payment_schedule_template_id) REFERENCES payroll_payment_schedule_templates(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- ignore if constraint already exists
  NULL;
END$$;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees (employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees (national_id);
CREATE INDEX IF NOT EXISTS idx_employees_start_date ON employees (start_date);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees (position_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees (department_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON employees (employee_type);
CREATE INDEX IF NOT EXISTS idx_employees_payment_schedule_template_id ON employees (payment_schedule_template_id);

-- Table: employee_user_groups (assigned user groups for an employee)
CREATE TABLE IF NOT EXISTS employee_user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_group_id uuid REFERENCES user_group(id) ON DELETE SET NULL,
  user_group_code varchar(64),
  user_group_name varchar(200),
  assigned_employee_id uuid, -- optional: employee id who is assigned for this group
  assigned_employee_name varchar(300),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eug_employee_id ON employee_user_groups(employee_id);

-- Table: employee_approvers
CREATE TABLE IF NOT EXISTS employee_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  screen_name varchar(200) NOT NULL,
  approver_code varchar(128),
  approver_name varchar(300),
  sort_order integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_approvers_employee_id ON employee_approvers(employee_id);

-- Helpful trigger to keep updated_at current (optional)
CREATE OR REPLACE FUNCTION trg_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON employees;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION trg_set_timestamp();

-- Done. Notes:
-- 1) Some display fields (position, unit, employee_group, level, etc.) are stored both as id (FK) and denormalized text for convenience.
-- 2) If your reference table names differ, update the FK clauses accordingly.
-- 3) Add additional tables (bank accounts, payment schedules) if you plan to store payment details normalized.
