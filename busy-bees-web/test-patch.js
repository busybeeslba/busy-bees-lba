const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: sheets, error: fetchErr } = await supabase.from('transaction_sheets').select('*').limit(1);
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  if (!sheets || sheets.length === 0) { console.log('No sheets found'); return; }
  
  const s = sheets[0];
  console.log('Original sheet ID:', s.id, typeof s.id);
  
  const payload = { ...s, clientName: s.clientName + ' test' };
  
  // attempt patch as dbClient does
  const { data, error } = await supabase.from('transaction_sheets').update(payload).eq('id', s.id).select().single();
  
  console.log('Update result data:', data ? 'SUCCESS' : 'NO DATA');
  console.log('Update result error:', error);
}

run();
