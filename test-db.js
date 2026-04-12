
const supabaseUrl = "https://xhynygijwclnagawvqkm.supabase.co";
const supabaseAnonKey = "sb_publishable_ss8KWJHkueBVE2p7DNp3CA_0IWthm7n";

async function test() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/transactions?select=*&limit=20`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    const data = await res.json();
    console.log(`Transactions (20):`, data);
    
    // Unique categories
    const categories = [...new Set(data.map(d => d.category))];
    console.log(`Current Categories:`, categories);
  } catch (err) {
    console.log(`Error:`, err.message);
  }
}

test();
