/*
# Lock down orders: public INSERT only, authenticated for everything else

## Purpose
The storefront must let any visitor place a cash-on-delivery order (INSERT),
but only a logged-in admin should be able to view, update, or delete orders.
Previously all four operations were open to everyone. This tightens
SELECT / UPDATE / DELETE to authenticated users so the admin panel (now
gated behind real Supabase email/password auth) is the only way to read or
manage orders.

## Changes to: orders (no columns changed, no data lost)
- INSERT policy stays open to anon + authenticated (customers place orders
  without signing in).
- SELECT / UPDATE / DELETE policies now require an authenticated session.
  Any visitor who hasn't signed in as admin gets zero rows back.

## Security
- RLS stays enabled.
- INSERT: anon + authenticated, WITH CHECK (true) — intentional, customers
  must be able to place orders.
- SELECT: authenticated only — only signed-in admins can see orders.
- UPDATE: authenticated only.
- DELETE: authenticated only.
- No user_id column is needed because there is no per-user ownership model:
  a single admin account reads all orders. Any authenticated user can view
  all orders, which is fine for a single-admin store. If multiple admins
  are added later they all see every order.
*/

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- INSERT stays public so customers can place orders without signing in
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders"
ON orders FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- SELECT now requires an authenticated session
DROP POLICY IF EXISTS "anon_select_orders" ON orders;
DROP POLICY IF EXISTS "authed_select_orders" ON orders;
CREATE POLICY "authed_select_orders"
ON orders FOR SELECT
TO authenticated USING (true);

-- UPDATE now requires an authenticated session
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
DROP POLICY IF EXISTS "authed_update_orders" ON orders;
CREATE POLICY "authed_update_orders"
ON orders FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- DELETE now requires an authenticated session
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
DROP POLICY IF EXISTS "authed_delete_orders" ON orders;
CREATE POLICY "authed_delete_orders"
ON orders FOR DELETE
TO authenticated USING (true);
