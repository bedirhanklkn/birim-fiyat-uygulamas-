const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  const { data, error } = await supabase
    .from('unit_prices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) console.error(error);
  else console.log(data);
}

checkData();
