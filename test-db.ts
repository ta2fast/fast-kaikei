
import { supabase } from './lib/supabase';

async function test() {
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  console.log('Transactions:', data, error);
  const { data: data2, error: error2 } = await supabase.from('accounting').select('*').limit(1);
  console.log('Accounting:', data2, error2);
}

test();
