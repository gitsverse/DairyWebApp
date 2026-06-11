-- Migration 2026040503: Row Level Security + private bills bucket
-- Depends: 2026040501, 2026040502. Run after Supabase Auth is available (auth.users).
-- In Dashboard: disable "Confirm email" for Email provider if you want instant login.

-- --- App tables: authenticated full access, anon none ---
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dairy_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_customers" ON customers;
DROP POLICY IF EXISTS "authenticated_all_products" ON products;
DROP POLICY IF EXISTS "authenticated_all_entries" ON entries;
DROP POLICY IF EXISTS "authenticated_all_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_all_dairy_profile" ON dairy_profile;
DROP POLICY IF EXISTS "authenticated_all_bill_shares" ON bill_shares;
DROP POLICY IF EXISTS "authenticated_insert_bills" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_select_bills" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_bills" ON storage.objects;

CREATE POLICY "authenticated_all_customers" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_products" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_entries" ON entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_transactions" ON transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_dairy_profile" ON dairy_profile
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_bill_shares" ON bill_shares
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- Storage: private bucket for generated PDFs ---
INSERT INTO storage.buckets (id, name, public)
VALUES ('bills', 'bills', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated_insert_bills" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bills');

CREATE POLICY "authenticated_select_bills" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bills');

CREATE POLICY "authenticated_delete_bills" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bills');
