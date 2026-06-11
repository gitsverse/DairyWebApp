-- Migration: Add 'due' transaction type for recording outstanding customer balances directly
-- This migration is completely safe for existing data because:
-- 1. It only expands the allowed values of the check constraint.
-- 2. It replaces an SQL function without dropping the underlying tables.

-- 1. Drop the existing type constraint on daily_transactions
ALTER TABLE daily_transactions DROP CONSTRAINT IF EXISTS daily_transactions_type_check;

-- 2. Re-create constraint to include the new 'due' type
ALTER TABLE daily_transactions ADD CONSTRAINT daily_transactions_type_check CHECK (type IN ('advance', 'payment', 'adjustment', 'due'));

-- 3. Replace the RPC function to correctly handle the 'due' transaction type in balance calculations
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
