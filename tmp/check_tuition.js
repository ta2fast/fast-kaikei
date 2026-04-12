const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkTuition() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const { data, error } = await supabase.from('tuition').select('*').limit(1);
  if (!error) {
    console.log('Tuition table found!');
    console.log('Columns:', Object.keys(data[0] || {}));
  } else {
    console.log('Tuition table error:', error.message);
  }
  
  // Also check 'payments'
  const { data: pData, error: pError } = await supabase.from('payments').select('*').limit(1);
  if (!pError) {
    console.log('Payments table found!');
    console.log('Columns:', Object.keys(pData[0] || {}));
  }
}

checkTuition();
