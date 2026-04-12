const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const supabase = createClient(url, key);

  console.log('--- students table ---');
  const { data: stData } = await supabase.from('students').select('*').limit(1);
  if (stData && stData.length > 0) console.log(Object.keys(stData[0]));

  console.log('--- system_settings table ---');
  const { data: ssData } = await supabase.from('system_settings').select('*').limit(1);
  if (ssData && ssData.length > 0) console.log(Object.keys(ssData[0]));
}

check();
