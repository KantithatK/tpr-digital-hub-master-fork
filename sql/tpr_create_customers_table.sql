-- Create extension for gen_random_uuid (pgcrypto). Supabase usually has this available.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store customers for TPR
CREATE TABLE IF NOT EXISTS tpr_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  name_th text NOT NULL,
  name_en text,
  type text,
  sector text,
  size text,
  status text,
  address text,
  website text,
  phone text,
  email text,
  contact_name text,
  contact_title text,
  contact_phone text,
  contact_email text,
  relationship_status text,
  lead_source text,
  lifetime_value numeric(14,2) DEFAULT 0,
  credit_term_days integer DEFAULT 0,
  tax_id text,
  billing_name text,
  billing_email text,
  billing_address text,
  retention_percent numeric(5,2) DEFAULT 0,
  past_project_count integer DEFAULT 0,
  total_project_value numeric(14,2) DEFAULT 0,
  payment_behavior text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- unique constraint on customer_id to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS tpr_customers_customer_id_idx ON tpr_customers (customer_id);

-- trigger function to update updated_at
CREATE OR REPLACE FUNCTION tpr_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tpr_customers_updated_at ON tpr_customers;
CREATE TRIGGER trg_tpr_customers_updated_at
BEFORE UPDATE ON tpr_customers
FOR EACH ROW
EXECUTE PROCEDURE tpr_set_updated_at();

-- Example insert (commented)
-- INSERT INTO tpr_customers (customer_id, name_th) VALUES ('CUST001', 'ตัวอย่าง - บริษัท จำกัด');
