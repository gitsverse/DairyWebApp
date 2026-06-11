-- Migration: Add Suppliers (Buyers) tables
-- Safe, non-destructive migration. Creates tables if they do not exist.

CREATE TABLE IF NOT EXISTS daily_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    default_milk_qty NUMERIC(10,2) DEFAULT 0,
    custom_milk_rate NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_supplier_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES daily_suppliers(id) ON DELETE RESTRICT,
    product_id INT NOT NULL REFERENCES daily_products(id),
    date DATE NOT NULL,
    shift VARCHAR NOT NULL CHECK (shift IN ('morning', 'evening')),
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity >= 0),
    price_per_unit NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED
);

CREATE INDEX IF NOT EXISTS idx_supplier_entries_supplier_date ON daily_supplier_entries(supplier_id, date);

CREATE TABLE IF NOT EXISTS daily_supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES daily_suppliers(id) ON DELETE RESTRICT,
    type VARCHAR NOT NULL CHECK (type IN ('advance', 'payment', 'adjustment', 'due')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    payment_mode VARCHAR NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'online', 'upi')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier_date ON daily_supplier_transactions(supplier_id, date);

CREATE OR REPLACE FUNCTION get_top_suppliers(p_start DATE, p_end DATE)
RETURNS TABLE (
  supplier_id UUID,
  name TEXT,
  total_liters NUMERIC,
  total_amount NUMERIC,
  total_paid NUMERIC,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name::text,
    COALESCE(SUM(e.quantity), 0) AS total_liters,
    COALESCE(SUM(e.total_amount), 0) AS total_amount,
    COALESCE((
      SELECT SUM(t.amount)
      FROM daily_supplier_transactions t
      WHERE t.supplier_id = s.id
        AND t.date BETWEEN p_start AND p_end
    ), 0) AS total_paid,
    COALESCE(SUM(e.total_amount), 0) - COALESCE((
      SELECT SUM(t.amount)
      FROM daily_supplier_transactions t
      WHERE t.supplier_id = s.id
        AND t.date BETWEEN p_start AND p_end
    ), 0) AS balance
  FROM daily_suppliers s
  LEFT JOIN daily_supplier_entries e
    ON e.supplier_id = s.id
   AND e.date BETWEEN p_start AND p_end
  GROUP BY s.id, s.name
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS for supplier tables
ALTER TABLE daily_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_supplier_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_supplier_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow ONLY logged-in users full access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users full access' AND tablename = 'daily_suppliers') THEN
        CREATE POLICY "Allow authenticated users full access" ON daily_suppliers FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users full access' AND tablename = 'daily_supplier_entries') THEN
        CREATE POLICY "Allow authenticated users full access" ON daily_supplier_entries FOR ALL TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users full access' AND tablename = 'daily_supplier_transactions') THEN
        CREATE POLICY "Allow authenticated users full access" ON daily_supplier_transactions FOR ALL TO authenticated USING (true);
    END IF;
END $$;
