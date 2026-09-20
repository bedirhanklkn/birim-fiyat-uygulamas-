const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function countData() {
  const { count, error } = await supabase
    .from('unit_prices')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error("Hata:", error);
  } else {
    console.log("TOPLAM_KAYIT_SAYISI=" + count);
  }
}

countData();
