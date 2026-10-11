/*
# German Tech Workshop Manager - Phase 1 Schema

## Overview
Creates the full database schema for a workshop management app for German cars.
Phase 1 includes: auth + roles, vehicle registration with QR codes, public QR page,
and the foundation for job cards and invoices (tables created but UI in later phases).

## New Tables

1. **profiles** - Staff accounts linked to auth.users. Role: 'owner' or 'staff'.
2. **workshop_settings** - Single-row workshop config (name, logo, address, GSTIN, invoice prefix).
3. **customers** - Customer records (name, phone, email, address).
4. **vehicles** - Cars registered to customers. Has a unique public_token for QR codes.
5. **jobs** - Job cards for vehicles (complaint, km, status, assigned mechanic).
6. **job_parts** - Spare parts used in a job (name, number, qty, price, GST).
7. **job_labour** - Labour lines for a job (description, hours, rate).
8. **job_photos** - Before/after photos for a job.
9. **invoices** - Invoices generated when a job is completed.
10. **payments** - Payment records against invoices.
11. **parts_catalogue** - Saved parts for autocomplete.

## Security (RLS)
- All staff tables: RLS enabled, scoped to authenticated users (owner + staff).
- Public access is ONLY through the `public_car_history` function, keyed by public_token.
- No direct public access to any table containing prices, invoices, or customer contact info.
- The public_car_history function returns ONLY: date, km, work description, part names, part numbers, photos.
  It NEVER returns prices, labour charges, totals, invoices, GST, or customer phone/address.

## Important Notes
1. public_token is a minimum 24-char random string, never derived from plate or ID.
2. The public_car_history RPC enforces privacy at the database level.
3. Only jobs with status 'completed' appear in the public history.
4. Invoice numbers are sequential per year (e.g. GT-2026-0001).
*/

-- ============================================================
-- PROFILES (staff roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- WORKSHOP SETTINGS (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS workshop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_name text NOT NULL DEFAULT 'German Tech',
  logo_url text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  gstin text DEFAULT '',
  invoice_prefix text NOT NULL DEFAULT 'GT',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON workshop_settings;
CREATE POLICY "settings_select" ON workshop_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_insert" ON workshop_settings;
CREATE POLICY "settings_insert" ON workshop_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "settings_update" ON workshop_settings;
CREATE POLICY "settings_update" ON workshop_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year int,
  number_plate text NOT NULL,
  vin text DEFAULT '',
  colour text DEFAULT '',
  fuel_type text DEFAULT '',
  current_km int DEFAULT 0,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  next_service_date date,
  next_service_km int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_number_plate ON vehicles (number_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles (customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_public_token ON vehicles (public_token);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  complaint text NOT NULL DEFAULT '',
  km_reading int DEFAULT 0,
  job_date date NOT NULL DEFAULT CURRENT_DATE,
  assigned_mechanic text DEFAULT '',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_progress', 'ready', 'completed')),
  internal_notes text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_vehicle_id ON jobs (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select" ON jobs;
CREATE POLICY "jobs_select" ON jobs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "jobs_insert" ON jobs;
CREATE POLICY "jobs_insert" ON jobs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "jobs_update" ON jobs;
CREATE POLICY "jobs_update" ON jobs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "jobs_delete" ON jobs;
CREATE POLICY "jobs_delete" ON jobs FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- JOB PARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  gst_percent numeric NOT NULL DEFAULT 18,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_parts_job_id ON job_parts (job_id);

ALTER TABLE job_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_parts_select" ON job_parts;
CREATE POLICY "job_parts_select" ON job_parts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "job_parts_insert" ON job_parts;
CREATE POLICY "job_parts_insert" ON job_parts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "job_parts_update" ON job_parts;
CREATE POLICY "job_parts_update" ON job_parts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "job_parts_delete" ON job_parts;
CREATE POLICY "job_parts_delete" ON job_parts FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- JOB LABOUR
-- ============================================================
CREATE TABLE IF NOT EXISTS job_labour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description text NOT NULL,
  hours numeric DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  fixed_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_labour_job_id ON job_labour (job_id);

ALTER TABLE job_labour ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_labour_select" ON job_labour;
CREATE POLICY "job_labour_select" ON job_labour FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "job_labour_insert" ON job_labour;
CREATE POLICY "job_labour_insert" ON job_labour FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "job_labour_update" ON job_labour;
CREATE POLICY "job_labour_update" ON job_labour FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "job_labour_delete" ON job_labour;
CREATE POLICY "job_labour_delete" ON job_labour FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- JOB PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'before' CHECK (photo_type IN ('before', 'after')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos (job_id);

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_photos_select" ON job_photos;
CREATE POLICY "job_photos_select" ON job_photos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "job_photos_insert" ON job_photos;
CREATE POLICY "job_photos_insert" ON job_photos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "job_photos_delete" ON job_photos;
CREATE POLICY "job_photos_delete" ON job_photos FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  gst_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_mode text DEFAULT '' CHECK (payment_mode IN ('', 'cash', 'upi', 'card')),
  signed_link_token text UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices (job_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_delete" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner'));

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_mode text NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'card')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments (invoice_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner'));

-- ============================================================
-- PARTS CATALOGUE
-- ============================================================
CREATE TABLE IF NOT EXISTS parts_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name text NOT NULL,
  part_number text DEFAULT '',
  default_price numeric DEFAULT 0,
  default_gst numeric DEFAULT 18,
  vehicle_make text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_catalogue_name ON parts_catalogue (part_name);

ALTER TABLE parts_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parts_catalogue_select" ON parts_catalogue;
CREATE POLICY "parts_catalogue_select" ON parts_catalogue FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "parts_catalogue_insert" ON parts_catalogue;
CREATE POLICY "parts_catalogue_insert" ON parts_catalogue FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parts_catalogue_update" ON parts_catalogue;
CREATE POLICY "parts_catalogue_update" ON parts_catalogue FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "parts_catalogue_delete" ON parts_catalogue;
CREATE POLICY "parts_catalogue_delete" ON parts_catalogue FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PUBLIC CAR HISTORY FUNCTION (privacy-enforced at DB level)
-- Returns ONLY: vehicle details + completed jobs with safe columns.
-- NEVER returns: prices, labour charges, totals, invoices, GST, notes, phone, address.
-- ============================================================
CREATE OR REPLACE FUNCTION public_car_history(p_public_token text)
RETURNS json AS $$
DECLARE
  v_vehicle json;
  v_jobs json;
  v_settings json;
BEGIN
  SELECT json_build_object(
    'make', v.make,
    'model', v.model,
    'year', v.year,
    'number_plate', v.number_plate,
    'colour', v.colour,
    'fuel_type', v.fuel_type
  )
  INTO v_vehicle
  FROM vehicles v
  WHERE v.public_token = p_public_token;

  IF v_vehicle IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'job_date', j.job_date,
      'km_reading', j.km_reading,
      'complaint', j.complaint,
      'parts', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'part_name', jp.part_name,
            'part_number', jp.part_number
          )
        ), '[]'::json)
        FROM job_parts jp
        WHERE jp.job_id = j.id
      ),
      'photos', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'photo_url', ph.photo_url,
            'photo_type', ph.photo_type
          )
        ), '[]'::json)
        FROM job_photos ph
        WHERE ph.job_id = j.id
      )
    )
    ORDER BY j.job_date DESC
  ), '[]'::json)
  INTO v_jobs
  FROM jobs j
  WHERE j.vehicle_id = (SELECT id FROM vehicles WHERE public_token = p_public_token)
    AND j.status = 'completed';

  SELECT json_build_object(
    'workshop_name', s.workshop_name,
    'logo_url', s.logo_url,
    'phone', s.phone,
    'address', s.address
  )
  INTO v_settings
  FROM workshop_settings s
  LIMIT 1;

  RETURN json_build_object(
    'found', true,
    'vehicle', v_vehicle,
    'jobs', v_jobs,
    'next_service_date', (SELECT next_service_date FROM vehicles WHERE public_token = p_public_token),
    'next_service_km', (SELECT next_service_km FROM vehicles WHERE public_token = p_public_token),
    'workshop', COALESCE(v_settings, json_build_object('workshop_name', 'German Tech', 'phone', '', 'address', ''))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The public function is callable by anon (no login needed for QR page)
GRANT EXECUTE ON FUNCTION public_car_history(text) TO anon, authenticated;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED: WORKSHOP SETTINGS + PARTS CATALOGUE + DEMO DATA
-- ============================================================
INSERT INTO workshop_settings (workshop_name, address, phone, gstin, invoice_prefix)
SELECT 'German Tech', 'No. 15, Anna Salai, Chennai, Tamil Nadu 600002', '+91 98765 43210', '33ABCDE1234F1Z5', 'GT'
WHERE NOT EXISTS (SELECT 1 FROM workshop_settings);

INSERT INTO parts_catalogue (part_name, part_number, default_price, default_gst, vehicle_make) VALUES
  ('Engine Oil Filter', 'BMW-11427800107', 1200, 18, 'BMW'),
  ('Air Filter', 'BMW-13717802047', 1800, 18, 'BMW'),
  ('Brake Pad Set Front', 'BMW-34116857200', 8500, 18, 'BMW'),
  ('Oil Filter', 'MB-A2761800009', 1500, 18, 'Mercedes-Benz'),
  ('Brake Disc Front', 'MB-A2204210112', 12000, 18, 'Mercedes-Benz'),
  ('Cabin Air Filter', 'MB-A2048300059', 2200, 18, 'Mercedes-Benz'),
  ('Spark Plug', 'AUDI-101905631', 1800, 18, 'Audi'),
  ('DSG Transmission Oil', 'VW-G052182A2', 4500, 18, 'Volkswagen'),
  ('Oil Filter', 'VW-03L115562', 950, 18, 'Volkswagen'),
  ('Brake Pad Set Rear', 'POR-95504402400', 11000, 18, 'Porsche')
ON CONFLICT DO NOTHING;
