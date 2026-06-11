-- Enforce unique customer phone numbers (ignoring NULL/blank).
-- Run once in Supabase SQL editor for existing DBs.

CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_phone_unique
ON customers (phone)
WHERE phone IS NOT NULL AND length(trim(phone)) > 0;

