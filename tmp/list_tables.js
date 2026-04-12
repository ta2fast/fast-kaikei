const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Tables ---');
    const { data: tables, error: tableError } = await supabase.rpc('get_tables'); // Fallback if rpc exists
    if (tableError) {
        console.log('RPC get_tables failed. Trying direct queries...');
        // Try common tables
        const checkTables = ['students', 'attendance', 'transactions', 'monthly_payments', 'invoices', 'fees'];
        for (const table of checkTables) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (!error) {
                console.log(`Table found: ${table}`);
                if (data.length > 0) {
                    console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
                } else {
                    console.log('Table exists but is empty.');
                }
            } else {
                console.log(`Table NOT found or error: ${table} (${error.message})`);
            }
        }
    } else {
        console.log(tables);
    }
}

checkSchema();
