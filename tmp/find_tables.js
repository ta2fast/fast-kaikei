const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function findTables() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const testNames = [
    'monthly_payments', 'tuition_payments', 'student_payments', 'fees', 'billing', 
    'school_fees', 'invoices', 'payment_status', 'accounts', 'tuitions', 'payments'
  ];
  
  for (const name of testNames) {
    const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Bingo! Table: ${name}`);
      const { data } = await supabase.from(name).select('*').limit(1);
      if (data && data.length > 0) console.log(`Columns for ${name}: ${Object.keys(data[0])}`);
    } else {
      // console.log(`Table ${name} not found.`);
    }
  }
}

findTables();
