const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkSchema() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  
  const supabase = createClient(url, key);
  
  console.log('--- Checking students table ---');
  const { data: students, error: studentError } = await supabase.from('students').select('*').limit(1);
  if (studentError) console.error('Student Error:', studentError);
  else console.log('Student Columns:', Object.keys(students[0] || {}));

  console.log('--- Probing for fee/invoice tables ---');
  const probeTables = ['monthly_payments', 'invoices', 'fees', 'fee_status', 'billing'];
  for (const table of probeTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table found: ${table}`);
      console.log(`Columns: ${Object.keys(data[0] || {})}`);
    } else {
      // console.log(`Table ${table} not found: ${error.message}`);
    }
  }

  console.log('--- Checking transactions table ---');
  const { data: trans, error: transError } = await supabase.from('transactions').select('*').limit(1);
  if (!transError) console.log('Transaction Columns:', Object.keys(trans[0] || {}));
}

checkSchema();
