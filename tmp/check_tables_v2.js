const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSchema() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  
  const supabase = createClient(url, key);
  
  const probeTables = ['monthly_payments', 'tuition_payments', 'invoices', 'fees'];
  for (const table of probeTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table found: ${table}`);
    } else {
      console.log(`Table ${table} error: ${error.message} (code: ${error.code})`);
    }
  }
}

checkSchema();
