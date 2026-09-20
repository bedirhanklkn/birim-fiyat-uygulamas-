// dotenv used via CLI
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resetData() {
  console.log("Veritabanına bağlanılıyor...");
  
  // poz_no sütunu null olmayan (yani tablodaki tüm) verileri siliyoruz
  const { error } = await supabase
    .from('unit_prices')
    .delete()
    .not('poz_no', 'is', null);

  if (error) {
    console.error("Veriler silinirken hata oluştu:", error.message);
  } else {
    console.log("İşlem Başarılı! Veritabanındaki tüm fiyat verileri sıfırlandı.");
  }
}

resetData();
