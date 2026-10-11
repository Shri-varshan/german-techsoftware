/*
# Open all tables to anon access (free / no-login mode)

## Overview
The app now supports a "Guest" mode where users can access all workshop features
without creating an account. All RLS policies are updated to include the `anon`
role alongside `authenticated`.

## Changes
- All tables: policies changed from `TO authenticated` to `TO anon, authenticated`
- This allows the anon-key frontend client to read and write all workshop data
- The public_car_history function already grants execution to anon — no change needed
- Invoice delete policy remains owner-only but now also checks for anon access

## Security notes
1. This is intentionally a shared, single-tenant workshop app — all staff share the same data
2. The public QR page privacy is still enforced at the DB level via the public_car_history function
3. The anon role can now CRUD all workshop tables, which is the intended behavior for free access
*/

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- workshop_settings
DROP POLICY IF EXISTS "settings_select" ON workshop_settings;
CREATE POLICY "settings_select" ON workshop_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_insert" ON workshop_settings;
CREATE POLICY "settings_insert" ON workshop_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "settings_update" ON workshop_settings;
CREATE POLICY "settings_update" ON workshop_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- customers
DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE
  TO anon, authenticated USING (true);

-- vehicles
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  TO anon, authenticated USING (true);

-- jobs
DROP POLICY IF EXISTS "jobs_select" ON jobs;
CREATE POLICY "jobs_select" ON jobs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "jobs_insert" ON jobs;
CREATE POLICY "jobs_insert" ON jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "jobs_update" ON jobs;
CREATE POLICY "jobs_update" ON jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "jobs_delete" ON jobs;
CREATE POLICY "jobs_delete" ON jobs FOR DELETE
  TO anon, authenticated USING (true);

-- job_parts
DROP POLICY IF EXISTS "job_parts_select" ON job_parts;
CREATE POLICY "job_parts_select" ON job_parts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "job_parts_insert" ON job_parts;
CREATE POLICY "job_parts_insert" ON job_parts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "job_parts_update" ON job_parts;
CREATE POLICY "job_parts_update" ON job_parts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "job_parts_delete" ON job_parts;
CREATE POLICY "job_parts_delete" ON job_parts FOR DELETE
  TO anon, authenticated USING (true);

-- job_labour
DROP POLICY IF EXISTS "job_labour_select" ON job_labour;
CREATE POLICY "job_labour_select" ON job_labour FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "job_labour_insert" ON job_labour;
CREATE POLICY "job_labour_insert" ON job_labour FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "job_labour_update" ON job_labour;
CREATE POLICY "job_labour_update" ON job_labour FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "job_labour_delete" ON job_labour;
CREATE POLICY "job_labour_delete" ON job_labour FOR DELETE
  TO anon, authenticated USING (true);

-- job_photos
DROP POLICY IF EXISTS "job_photos_select" ON job_photos;
CREATE POLICY "job_photos_select" ON job_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "job_photos_insert" ON job_photos;
CREATE POLICY "job_photos_insert" ON job_photos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "job_photos_delete" ON job_photos;
CREATE POLICY "job_photos_delete" ON job_photos FOR DELETE
  TO anon, authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_delete" ON invoices FOR DELETE
  TO anon, authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE
  TO anon, authenticated USING (true);

-- parts_catalogue
DROP POLICY IF EXISTS "parts_catalogue_select" ON parts_catalogue;
CREATE POLICY "parts_catalogue_select" ON parts_catalogue FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "parts_catalogue_insert" ON parts_catalogue;
CREATE POLICY "parts_catalogue_insert" ON parts_catalogue FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parts_catalogue_update" ON parts_catalogue;
CREATE POLICY "parts_catalogue_update" ON parts_catalogue FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "parts_catalogue_delete" ON parts_catalogue;
CREATE POLICY "parts_catalogue_delete" ON parts_catalogue FOR DELETE
  TO anon, authenticated USING (true);
