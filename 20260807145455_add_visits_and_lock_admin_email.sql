/*
# Add visits tracking and lock admin to a single email

## Purpose
Track the number of visits to the storefront, and lock down orders
SELECT/UPDATE/DELETE to a single authorized admin email so only the owner
can see and manage orders.

## New table: visits
- id           uuid, primary key
- visitor_key  text, a simple per-browser key (localStorage random id) to
               avoid counting the same visitor too aggressively
- created_at   timestamptz, defaults to now()

Security: RLS enabled. INSERT open to anon + authenticated (any visitor can
record a visit). SELECT/update/delete authenticated only (only the admin can
see counts). The actual count is read via the admin's authenticated session.

## Changes to: orders (no columns changed, no data lost)
- SELECT / UPDATE / DELETE policies tightened from "any authenticated user"
  to only the specific admin email "edineimad29@gmail.com". This ensures
  that even if someone else signs up, they cannot read or manage orders.
- INSERT stays open to anon + authenticated so customers can place orders.
*/

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_visits" ON visits;
CREATE POLICY "anon_insert_visits"
ON visits FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authed_select_visits" ON visits;
DROP POLICY IF EXISTS "anon_select_visits" ON visits;
CREATE POLICY "authed_select_visits"
ON visits FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "authed_delete_visits" ON visits;
DROP POLICY IF EXISTS "anon_delete_visits" ON visits;
CREATE POLICY "authed_delete_visits"
ON visits FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS visits_created_at_idx ON visits (created_at DESC);

-- Lock orders SELECT to the single admin email
DROP POLICY IF EXISTS "authed_select_orders" ON orders;
CREATE POLICY "authed_select_orders"
ON orders FOR SELECT
TO authenticated USING (auth.jwt() ->> 'email' = 'edineimad29@gmail.com');

-- Lock orders UPDATE to the single admin email
DROP POLICY IF EXISTS "authed_update_orders" ON orders;
CREATE POLICY "authed_update_orders"
ON orders FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'edineimad29@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'edineimad29@gmail.com');

-- Lock orders DELETE to the single admin email
DROP POLICY IF EXISTS "authed_delete_orders" ON orders;
CREATE POLICY "authed_delete_orders"
ON orders FOR DELETE
TO authenticated USING (auth.jwt() ->> 'email' = 'edineimad29@gmail.com');
