-- Migration 2026040501: Core tables (customers, products, entries, transactions, RPC)
-- Run on a fresh database OR after backup. Drops existing app tables if present.
-- Depends: none. Next: 2026040502_dairy_profile_bill_shares.sql

DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    default_milk_qty NUMERIC(10,2) DEFAULT 0,
    custom_milk_rate NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    default_rate NUMERIC(10,2) NOT NULL,
    unit VARCHAR NOT NULL CHECK (unit IN ('liter', 'kg')),
    CONSTRAINT products_name_format CHECK (
      char_length(trim(name)) >= 1
      AND name = lower(trim(name))
    )
);

INSERT INTO products (name, default_rate, unit) VALUES
('milk', 60, 'liter'),
('ghee', 850, 'kg')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    date DATE NOT NULL,
    shift VARCHAR NOT NULL CHECK (shift IN ('morning', 'evening')),
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity >= 0),
    price_per_unit NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED
);

CREATE INDEX idx_entries_customer_date ON entries(customer_id, date);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('advance', 'payment', 'adjustment')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    payment_mode VARCHAR NOT NULL CHECK (payment_mode IN ('cash', 'online', 'upi')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT
);

CREATE INDEX idx_transactions_customer_date ON transactions(customer_id, date);

CREATE OR REPLACE FUNCTION get_top_customers(p_start DATE, p_end DATE)
RETURNS TABLE (
  customer_id UUID,
  name TEXT,
  total_liters NUMERIC,
  total_amount NUMERIC,
  total_paid NUMERIC,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    COALESCE(SUM(e.quantity), 0) AS total_liters,
    COALESCE(SUM(e.total_amount), 0) AS total_amount,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.customer_id = c.id
        AND t.date BETWEEN p_start AND p_end
    ), 0) AS total_paid,
    COALESCE(SUM(e.total_amount), 0) - COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.customer_id = c.id
        AND t.date BETWEEN p_start AND p_end
    ), 0) AS balance
  FROM customers c
  LEFT JOIN entries e
    ON e.customer_id = c.id
   AND e.date BETWEEN p_start AND p_end
  GROUP BY c.id, c.name
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE;
