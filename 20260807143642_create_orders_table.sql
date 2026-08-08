/*
# Create orders table for Cha.Nechri storefront

## Purpose
The storefront lets customers place cash-on-delivery orders. Previously orders
were saved to a non-existent `window.storage` and silently lost. This table
persists every order so the admin dashboard (#admin) can list them.

## New table: orders
- id            uuid, primary key
- order_no      text, the human-readable reference shown to the customer (e.g. 260807-123)
- customer_name text, customer full name
- customer_phone text, customer phone number
- wilaya        text, delivery wilaya
- address       text, commune / address (blank for bureau delivery)
- delivery_type text, 'domicile' or 'bureau'
- items         jsonb, array of {id, name, unitPrice, qty, lineTotal}
- items_total   integer, subtotal in DZD
- shipping_fee  integer, shipping fee in DZD
- grand_total   integer, total to collect on delivery in DZD
- status        text, order status, defaults to 'nouveau'
- created_at    timestamptz, defaults to now()

## Security
- RLS enabled on orders.
- This is a no-login storefront (no sign-in screen). The browser talks to
  Supabase with the anon key for its entire lifetime, so every policy lists
  `TO anon, authenticated` and the data is intentionally public/shared
  (any visitor can place an order, and the admin panel reads them back with
  the same anon key). This is documented as intentional.
- INSERT is open so customers can place orders without signing in.
- SELECT is open so the admin dashboard can list orders.
- UPDATE/DELETE are open so the admin can mark orders fulfilled or remove
  test/spam orders from the dashboard.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  wilaya text NOT NULL,
  address text NOT NULL DEFAULT '',
  delivery_type text NOT NULL DEFAULT 'domicile',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  items_total integer NOT NULL DEFAULT 0,
  shipping_fee integer NOT NULL DEFAULT 0,
  grand_total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'nouveau',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders"
ON orders FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders"
ON orders FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders"
ON orders FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders"
ON orders FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_order_no_idx ON orders (order_no);
