import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyd3Z1Z3ppa3dtYmJydG50b3NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzExMTcxNCwiZXhwIjoyMDkyNjg3NzE0fQ.W6rx7z_Bk9ulNPJoI_zlklsL_8h9wtXV72UVoo5x6U8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: customers } = await supabase.from('daily_customers').select('*');
  console.log("All Customers:", customers);

  const { data: entries } = await supabase.from('daily_entries').select('*');
  console.log("All Entries count:", entries?.length);
  for (const e of entries || []) {
    console.log(`Entry: cust_id=${e.customer_id}, date=${e.date}, total=${e.total_amount}`);
  }

  const { data: txs } = await supabase.from('daily_transactions').select('*');
  console.log("All Transactions count:", txs?.length);
  for (const t of txs || []) {
    console.log(`Tx: cust_id=${t.customer_id}, date=${t.date}, type=${t.type}, amount=${t.amount}`);
  }
}
main();
