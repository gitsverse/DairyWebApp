-- Step 1: Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_new_user_trial ON user_profiles;

-- Step 2: Fix the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW; -- Don't block user creation if profile fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Fix the free trial function
CREATE OR REPLACE FUNCTION assign_free_trial()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_id INT;
BEGIN
    SELECT id INTO v_plan_id 
    FROM public.subscription_plans 
    WHERE name = 'free_trial'
    LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
        INSERT INTO public.user_subscriptions 
            (user_id, plan_id, status, start_date, end_date, payment_mode)
        VALUES 
            (NEW.id, v_plan_id, 'active', 
             CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'free')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW; -- Don't block profile creation if trial fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-create both triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_new_user_trial
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION assign_free_trial();