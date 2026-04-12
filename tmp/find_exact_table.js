const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listAllTables() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const supabase = createClient(url, key);

  console.log('--- Attempting to find table names ---');
  
  // Try common table names and check if they exist
  const probe = [
    'monthly_payments', 'tuition_payments', 'student_payments', 'fees', 'billing', 
    'school_fees', 'invoices', 'payment_status', 'accounts', 'tuition_fees', 'tuition'
  ];
  
  for (const name of probe) {
    const { data, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`EXACT NAME FOUND: ${name}`);
      const { data: cols } = await supabase.from(name).select('*').limit(1);
      if (cols && cols.length > 0) console.log(`  Columns: ${Object.keys(cols[0])}`);
      else console.log(`  Columns: (Empty table)`);
    } else {
      // console.log(`  Not found: ${name} (${error.message})`);
    }
  }
}

listAllTables();
