/**
 * Create a demo Supabase Auth user (admin API).
 * Usage:
 *   npm run create-demo-user
 *   npm run create-demo-user -- dairyadmin@example.com SimplePassword123
 *
 * Requires .env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
 
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* no .env */
  }
}
 
loadEnv();
 
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 
const [emailArg, passwordArg] = process.argv.slice(2);
const email = emailArg || "dairyadmin@example.com";
const password = passwordArg || "SimplePassword123";
 
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
 
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
 
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
 
if (error) {
  console.error(error.message);
  process.exit(1);
}
 
console.log("Demo user created:", data.user?.id, data.user?.email);
