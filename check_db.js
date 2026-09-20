// dotenv used via CLI
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  console.log("Bağlanılıyor: " + supabaseUrl);
  const { data, error } = await supabase.from('unit_prices').select('*').limit(1);
  if (error) {
    console.error("Hata! Tabloya erişilemiyor veya tablo yok:");
    console.error(error.message);
  } else {
    console.log("Başarılı! 'unit_prices' tablosu mevcut.");
    console.log("Tablodaki örnek veri:", data);
  }
}

checkTable();
