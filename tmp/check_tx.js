const {createClient}=require('@supabase/supabase-js');
const fs=require('fs');
const env=fs.readFileSync('.env.local','utf8');
const url=env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key=env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const sb=createClient(url,key);
sb.from('transactions').select('*').order('created_at', {ascending: false}).limit(5).then(r=>console.log(JSON.stringify(r.data, null, 2)));
