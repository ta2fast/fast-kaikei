
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching transactions:', error);
    // Maybe table doesn't exist? Check all tables.
    const { data: tables, error: tError } = await supabase.rpc('get_tables'); // custom rpc?
    // or just try common name 'accounting'
    const { data: accData, error: accError } = await supabase.from('accounting').select('*').limit(1);
    if (accError) console.error('Error fetching accounting:', accError);
    else console.log('Accounting columns:', Object.keys(accData[0] || {}));
  } else {
    console.log('Transactions columns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
