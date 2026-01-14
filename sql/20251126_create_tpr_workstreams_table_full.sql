-- SQL: 20251126_create_tpr_workstreams_table_full.sql
-- สร้างตาราง "แผนงานโครงการ" (Project Workstreams) ตั้งแต่ต้น ไม่อ้างอิงไฟล์เก่า
-- ใช้ได้กับ PostgreSQL / Supabase

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- สำหรับ gen_random_uuid()

-- สถานะที่รองรับ (ไทย + คีย์ EN เดิม 'Planning' เผื่อข้อมูลเก่า)
-- ยังไม่เริ่ม / ทำอยู่ / เสี่ยง / ล่าช้า / เสร็จแล้ว

CREATE TABLE IF NOT EXISTS tpr_workstreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  code varchar(100) NOT NULL,             -- รหัสแผนงานในโครงการ (เช่น WS-01)
  name varchar(400) NOT NULL,             -- ชื่อแผนงาน
  description text,                       -- รายละเอียดเพิ่มเติม
  team_department varchar(400),           -- ชื่อทีม / แผนก ที่รับผิดชอบ
  team_id uuid,                           -- FK ไปตารางทีม (tpr_project_teams) เพื่อความสัมพันธ์จริง
  owner uuid,                             -- employee id ของหัวหน้าทีม / owner
  budget_amount numeric(18,2) DEFAULT 0,  -- งบประมาณที่จัดสรร
  spent_amount numeric(18,2) DEFAULT 0,   -- ใช้ไปแล้ว (อัพเดตจากระบบการเงิน)
  planned_hours numeric(12,2) DEFAULT 0,  -- ชั่วโมงที่วางแผน
  start_date date,                        -- วันที่เริ่ม
  end_date date,                          -- วันที่สิ้นสุด
  status varchar(40) DEFAULT 'ยังไม่เริ่ม', -- สถานะ
  progress integer DEFAULT 0,             -- ความคืบหน้า (% 0-100)
  archived boolean DEFAULT false,         -- ปิดแล้วหรือไม่
  created_by varchar(200),
  created_at timestamptz DEFAULT now(),
  updated_by varchar(200),
  updated_at timestamptz DEFAULT now(),
  deleted boolean DEFAULT false,
  deleted_at timestamptz
);

-- UNIQUE code ต่อ project ป้องกันซ้ำ
ALTER TABLE tpr_workstreams
  ADD CONSTRAINT uq_tpr_workstreams_project_code UNIQUE (project_id, code) DEFERRABLE INITIALLY IMMEDIATE;

-- CHECK สถานะ (รวม 'Planning' ไว้รองรับ data เก่า)
ALTER TABLE tpr_workstreams
  ADD CONSTRAINT chk_tpr_workstreams_status CHECK (status IN (
    'ยังไม่เริ่ม','ทำอยู่','เสี่ยง','ล่าช้า','เสร็จแล้ว','Planning'
  ));

-- CHECK progress range
ALTER TABLE tpr_workstreams
  ADD CONSTRAINT chk_tpr_workstreams_progress CHECK (progress BETWEEN 0 AND 100);

-- Foreign Keys (สร้างเฉพาะเมื่อมีตารางอ้างอิงอยู่จริง)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_projects') THEN
    BEGIN
      ALTER TABLE tpr_workstreams
        ADD CONSTRAINT fk_tpr_workstreams_project FOREIGN KEY (project_id)
        REFERENCES tpr_projects(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'employees') THEN
    BEGIN
      ALTER TABLE tpr_workstreams
        ADD CONSTRAINT fk_tpr_workstreams_owner FOREIGN KEY (owner)
        REFERENCES employees(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tpr_project_teams') THEN
    BEGIN
      ALTER TABLE tpr_workstreams
        ADD CONSTRAINT fk_tpr_workstreams_team FOREIGN KEY (team_id)
        REFERENCES tpr_project_teams(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- Indexes สำหรับ query เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_project_id ON tpr_workstreams(project_id);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_code ON tpr_workstreams(code);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_status ON tpr_workstreams(status);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_owner ON tpr_workstreams(owner);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_start_date ON tpr_workstreams(start_date);
CREATE INDEX IF NOT EXISTS idx_tpr_workstreams_team_id ON tpr_workstreams(team_id);

-- Trigger อัพเดต updated_at
CREATE OR REPLACE FUNCTION trg_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_tpr_workstreams ON tpr_workstreams;
CREATE TRIGGER set_timestamp_tpr_workstreams
BEFORE UPDATE ON tpr_workstreams
FOR EACH ROW
EXECUTE FUNCTION trg_set_timestamp();

-- View แสดงชื่อหัวหน้าทีม (Thai display logic แบบง่าย) สามารถปรับภายหลัง
CREATE OR REPLACE VIEW v_tpr_workstreams_with_owner AS
SELECT w.*, 
       CASE 
         WHEN e.first_name_th IS NOT NULL AND e.last_name_th IS NOT NULL THEN e.first_name_th || ' ' || e.last_name_th
         WHEN e.first_name_en IS NOT NULL AND e.last_name_en IS NOT NULL THEN e.first_name_en || ' ' || e.last_name_en
         WHEN e.nickname_th IS NOT NULL THEN e.nickname_th
         WHEN e.nickname_en IS NOT NULL THEN e.nickname_en
         ELSE e.employee_code
       END AS owner_name
FROM tpr_workstreams w
LEFT JOIN employees e ON e.id = w.owner;

-- View สำหรับงบคงเหลือ
CREATE OR REPLACE VIEW v_tpr_workstreams_budget_summary AS
SELECT id, project_id, code, name, team_id,
       budget_amount, spent_amount,
       (budget_amount - spent_amount) AS remaining_amount,
       status, progress
FROM tpr_workstreams
WHERE archived = false AND deleted = false;

-- เสร็จสิ้นการสร้างตารางแผนงานโครงการ
