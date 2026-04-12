import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined.');
  console.error('Please make sure you have a .env.local file with these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('--- Checking Schema ---');

  // Check transactions table
  const { data: transactions, error: tError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);

  if (tError) {
    console.error('Error fetching transactions:', tError.message);
  } else {
    console.log('Transactions columns:', Object.keys(transactions?.[0] || {}));
  }

  // Check students table
  const { data: students, error: sError } = await supabase
    .from('students')
    .select('*')
    .limit(1);

  if (sError) {
    console.error('Error fetching students:', sError.message);
  } else {
    console.log('Students columns:', Object.keys(students?.[0] || {}));
  }
}

checkSchema().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
