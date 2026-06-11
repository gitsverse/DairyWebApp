Dairy Management — SQL migration order
======================================

Run these files in the Supabase SQL Editor (or psql) in order:

1. 2026040501_initial_core_tables.sql
   WARNING: Drops customers, products, entries, transactions. Backup first if you have data.

2. 2026040502_dairy_profile_bill_shares.sql
   Safe to re-run (IF NOT EXISTS).

3. 2026040503_rls_and_storage.sql
   Enables RLS. If policies already exist, drop them first or adjust script.
   Creates storage bucket "bills" (private).

Auth: Authentication > Providers > Email > disable "Confirm email" for password login without inbox.

User bootstrap: node scripts/create-user.mjs <email> <password>
(requires .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
