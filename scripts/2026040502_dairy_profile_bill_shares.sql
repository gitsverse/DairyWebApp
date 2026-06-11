-- Migration 2026040502: Dairy branding/settings + bill share audit trail
-- Depends: 2026040501_initial_core_tables.sql
-- Next: 2026040503_rls_and_storage.sql

CREATE TABLE IF NOT EXISTS dairy_profile (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    dairy_name VARCHAR(200) NOT NULL DEFAULT 'My Dairy',
    tagline VARCHAR(300),
    address TEXT,
    phone VARCHAR(50),
    gst VARCHAR(50),
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO dairy_profile (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS bill_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_shares_customer ON bill_shares(customer_id, period_start, period_end);
