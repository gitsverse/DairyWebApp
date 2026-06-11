import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qrwvugzikwmbbrtntosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyd3Z1Z3ppa3dtYmJydG50b3NtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzExMTcxNCwiZXhwIjoyMDkyNjg3NzE0fQ.W6rx7z_Bk9ulNPJoI_zlklsL_8h9wtXV72UVoo5x6U8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('get_policies');
  console.log("RPC Error:", error);
  // We can query pg_policies using postgres directly, but since we only have the supabase JS client,
  // we cannot easily query pg_policies. Let's instead try to do an authenticated insert and select
  // by creating a test user, but we can't easily do that either.
}
main();
