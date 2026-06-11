import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const anonKey = 'sb_publishable_SR9_hI2-CHR826n7dOOBpQ_Gip7AGKd';
const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data: suppliers } = await supabase.from('daily_suppliers').select('*');
  console.log("=== SUPPLIERS ===");
  console.log(JSON.stringify(suppliers, null, 2));

  for (const s of suppliers || []) {
    const { data: entries } = await supabase.from('daily_supplier_entries').select('*').eq('supplier_id', s.id);
    const { data: txs } = await supabase.from('daily_supplier_transactions').select('*').eq('supplier_id', s.id);
    console.log(`\n=== SUPPLIER: ${s.name} (${s.id}) ===`);
    console.log("Entries:", JSON.stringify(entries, null, 2));
    console.log("Transactions:", JSON.stringify(txs, null, 2));
  }
  process.exit(0);
}
main();
