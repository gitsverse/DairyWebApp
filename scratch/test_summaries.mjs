import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const anonKey = 'sb_publishable_SR9_hI2-CHR826n7dOOBpQ_Gip7AGKd';
const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data: rows } = await supabase.from('daily_suppliers').select('id, name');
  const { data: entries } = await supabase.from('daily_supplier_entries').select('supplier_id, total_amount');
  const { data: txs } = await supabase.from('daily_supplier_transactions').select('supplier_id, amount, type');

  const purchasesMap = new Map();
  const paidMap = new Map();

  for (const e of entries || []) {
    const id = e.supplier_id;
    purchasesMap.set(id, (purchasesMap.get(id) || 0) + Number(e.total_amount || 0));
  }
  for (const t of txs || []) {
    const id = t.supplier_id;
    console.log(`Tx: ${t.supplier_id}, Type: ${t.type}, Amount: ${t.amount}`);
    if (t.type === 'due') {
      purchasesMap.set(id, (purchasesMap.get(id) || 0) + Number(t.amount || 0));
    } else {
      paidMap.set(id, (paidMap.get(id) || 0) + Number(t.amount || 0));
    }
  }

  for (const s of rows || []) {
    const purchases = purchasesMap.get(s.id) || 0;
    const paid = paidMap.get(s.id) || 0;
    console.log(`Supplier: ${s.name}, Purchases: ${purchases}, Paid: ${paid}, Balance: ${purchases - paid}`);
  }
  process.exit(0);
}
main();
