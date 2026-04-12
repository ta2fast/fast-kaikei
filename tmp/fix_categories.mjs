import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

// Mapping: old Japanese category names -> new standard IDs
const MAPPING = {
  'イベント出演費': 'event',
  'イベント参加費': 'event',
  'スクール月謝': 'school',
  '備品・消耗品': 'pool',
  '用具・備品費': 'pool',
  '積立・その他': 'other',
  'なし': 'other',
};

for (const [oldCat, newCat] of Object.entries(MAPPING)) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ category: newCat })
    .eq('category', oldCat)
    .select('id');
  
  if (error) {
    console.log(`ERROR updating "${oldCat}": ${error.message}`);
  } else {
    console.log(`Updated "${oldCat}" -> "${newCat}": ${data.length} rows`);
  }
}

console.log('\nDone! All categories normalized.');
