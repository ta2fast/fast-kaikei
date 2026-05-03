const {createClient}=require('@supabase/supabase-js');
const fs=require('fs');
const env=fs.readFileSync('.env.local','utf8');
const url=env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key=env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Use postgres meta API or just use the connection string if we have it? No, we don't have connection string.
// Let's use supabase.rpc or raw sql if possible? Supabase REST API does not allow ALTER TABLE directly.
// But wait, how do I execute raw SQL? 
