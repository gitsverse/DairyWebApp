CREATE TABLE IF NOT EXISTS retail_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity >= 0),
    total_amount NUMERIC(12,2) NOT NULL,
    payment_mode VARCHAR NOT NULL CHECK (payment_mode IN ('cash', 'online', 'upi')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_retail_sales_date ON retail_sales(date);
