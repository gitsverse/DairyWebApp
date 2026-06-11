import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const anonKey = 'sb_publishable_SR9_hI2-CHR826n7dOOBpQ_Gip7AGKd';
const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const email = 'testuser' + Date.now() + '@example.com';
  const password = 'password123';
  
  // Sign up a dummy user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  
  console.log("Logged in:", authData.user?.id);
  
  const { data: salesData, error: salesError } = await supabase
    .from('daily_retail_sales')
    .select('id, date, product_id, quantity, total_amount, payment_mode, created_at, daily_products(name)')
    .order('created_at', { ascending: false });
    
  if (salesError) {
    console.error("Sales Fetch Error:", salesError);
  } else {
    console.log("Sales Data for authenticated user:", salesData);
  }
}
main();
