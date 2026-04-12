const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function dumpSchema() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const found = ['monthly_payments', 'fees', 'accounts', 'tuition', 'payments', 'payment_status'];
  for (const name of found) {
    console.log(`\n\n--- ${name} ---`);
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (!error) {
        if (data && data.length > 0) console.log(Object.keys(data[0]));
        else console.log('Empty table - try common columns');
    } else {
        console.log(`Error: ${error.message}`);
    }
  }
}

dumpSchema();
