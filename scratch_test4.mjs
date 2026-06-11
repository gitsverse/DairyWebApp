import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const anonKey = 'sb_publishable_SR9_hI2-CHR826n7dOOBpQ_Gip7AGKd';
const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data, error } = await supabase.from('daily_retail_sales').insert({
    date: '2026-05-20',
    product_id: 1,
    quantity: 10,
    total_amount: 600,
    payment_mode: 'cash'
  }).select();
  
  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success:", data);
  }
}
main();
