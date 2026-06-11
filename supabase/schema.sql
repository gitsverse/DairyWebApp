-- 1 -- Drop existing tables if they exist
DROP TABLE IF EXISTS daily_bill_shares CASCADE;
DROP TABLE IF EXISTS daily_entries CASCADE;
DROP TABLE IF EXISTS daily_transactions CASCADE;
DROP TABLE IF EXISTS daily_profile CASCADE;
DROP TABLE IF EXISTS daily_products CASCADE;
DROP TABLE IF EXISTS daily_customers CASCADE;
DROP TABLE IF EXISTS daily_retail_sales CASCADE;

-- Also drop old names just in case
DROP TABLE IF EXISTS bill_shares CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS dairy_profile CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS retail_sales CASCADE;
DROP TABLE IF EXISTS dairy_customers CASCADE;
DROP TABLE IF EXISTS dairy_products CASCADE;
DROP TABLE IF EXISTS dairy_entries CASCADE;
DROP TABLE IF EXISTS dairy_transactions CASCADE;
DROP TABLE IF EXISTS dairy_bill_shares CASCADE;
DROP TABLE IF EXISTS dairy_retail_sales CASCADE;

CREATE TABLE daily_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    default_milk_qty NUMERIC(10,2) DEFAULT 0,
    custom_milk_rate NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE daily_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    default_rate NUMERIC(10,2) NOT NULL,
    unit VARCHAR NOT NULL CHECK (unit IN ('liter', 'kg')),
    CONSTRAINT products_name_format CHECK (
      char_length(trim(name)) >= 1
      AND name = lower(trim(name))
    )
);

INSERT INTO daily_products (name, default_rate, unit) VALUES
('milk', 60, 'liter'),
('ghee', 850, 'kg')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE daily_profile (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    dairy_name VARCHAR(200) NOT NULL DEFAULT 'My Dairy',
    tagline VARCHAR(300),
    address TEXT,
    phone VARCHAR(50),
    gst VARCHAR(50),
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO daily_profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE daily_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES daily_customers(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES daily_products(id),
    date DATE NOT NULL,
    shift VARCHAR NOT NULL CHECK (shift IN ('morning', 'evening')),
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity >= 0),
    price_per_unit NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED
);

CREATE INDEX idx_entries_customer_date ON daily_entries(customer_id, date);

CREATE TABLE daily_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES daily_customers(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('advance', 'payment', 'adjustment', 'due')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    payment_mode VARCHAR NOT NULL CHECK (payment_mode IN ('cash', 'online', 'upi')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT
);

CREATE INDEX idx_transactions_customer_date ON daily_transactions(customer_id, date);

CREATE TABLE daily_bill_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES daily_customers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX idx_bill_shares_customer ON daily_bill_shares(customer_id, period_start, period_end);

CREATE TABLE daily_retail_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id INT NOT NULL REFERENCES daily_products(id),
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity >= 0),
    total_amount NUMERIC(12,2) NOT NULL,
    payment_mode VARCHAR NOT NULL CHECK (payment_mode IN ('cash', 'online', 'upi')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_retail_sales_date ON daily_retail_sales(date);

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
            FROM daily_transactions t
            WHERE t.customer_id = c.id
                AND t.type IN ('advance', 'payment', 'adjustment')
                AND t.date BETWEEN p_start AND p_end
        ), 0) AS total_paid,
        -- balance = (totalSales + totalDues) - totalPaid
        COALESCE(SUM(e.total_amount), 0) 
        + COALESCE((
            SELECT SUM(t.amount)
            FROM daily_transactions t
            WHERE t.customer_id = c.id
                AND t.type = 'due'
                AND t.date BETWEEN p_start AND p_end
        ), 0)
        - COALESCE((
            SELECT SUM(t.amount)
            FROM daily_transactions t
            WHERE t.customer_id = c.id
                AND t.type IN ('advance', 'payment', 'adjustment')
                AND t.date BETWEEN p_start AND p_end
        ), 0) AS balance
    FROM daily_customers c
    LEFT JOIN daily_entries e
        ON e.customer_id = c.id
     AND e.date BETWEEN p_start AND p_end
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2 -- Enable RLS for all tables
ALTER TABLE daily_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bill_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_retail_sales ENABLE ROW LEVEL SECURITY;

-- Create policies to allow ONLY logged-in users full access
CREATE POLICY "Allow authenticated users full access" ON daily_customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON daily_products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON daily_profile FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON daily_entries FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON daily_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON daily_bill_shares FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON daily_retail_sales FOR ALL TO authenticated USING (true);

-- 3 -- Create the private storage bucket for bills
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bills', 'bills', false)
ON CONFLICT (id) DO NOTHING;

-- Allow logged-in users to upload PDFs to the bills bucket
CREATE POLICY "Allow authenticated uploads to bills" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bills');

-- Allow logged-in users to read PDFs from the bills bucket
CREATE POLICY "Allow authenticated reads from bills" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'bills');

-- 4 -- Allow logged-in users to overwrite existing PDFs
CREATE POLICY "Allow authenticated updates to bills" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'bills');

-- Allow logged-in users to delete old PDFs if needed
CREATE POLICY "Allow authenticated deletes from bills" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'bills');
