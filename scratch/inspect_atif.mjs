import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const anonKey = 'sb_publishable_SR9_hI2-CHR826n7dOOBpQ_Gip7AGKd';
const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data: customer } = await supabase.from('daily_customers').select('*').ilike('name', '%atif%').maybeSingle();
  console.log("Customer Atif:", customer);
  if (customer) {
    const { data: entries } = await supabase.from('daily_entries').select('*').eq('customer_id', customer.id);
    const { data: txs } = await supabase.from('daily_transactions').select('*').eq('customer_id', customer.id);
    console.log("Entries:", entries);
    console.log("Transactions:", txs);
  }
  process.exit(0);
}
main();
