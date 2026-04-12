import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

const { data } = await supabase.from('transactions').select('title, category, amount, date').order('date', { ascending: false });

const lines = [];
const cats = [...new Set(data.map(d => d.category))];
lines.push('UNIQUE CATEGORIES: ' + JSON.stringify(cats));

cats.forEach(c => {
  const items = data.filter(d => d.category === c);
  const total = items.reduce((s, d) => s + d.amount, 0);
  lines.push('CAT="' + c + '" count=' + items.length + ' total=' + total);
});

lines.push('');
lines.push('ALL ITEMS:');
data.forEach(d => lines.push(d.date + ' | cat="' + d.category + '" | ' + d.title + ' | ' + d.amount));

writeFileSync('tmp/cat_result.txt', lines.join('\n'), 'utf-8');
console.log('Done - check tmp/cat_result.txt');
