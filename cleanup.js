const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanup() {
  console.log("Hatalı (Birimi boş veya fiyatı 0 olan) kayıtlar siliniyor...");
  
  const { data, error } = await supabase
    .from('unit_prices')
    .delete()
    .eq('birim', ''); // Birimi boş olanları sil

  if (error) {
    console.error("Hata:", error);
  } else {
    console.log("Başarılı! Hatalı yüklenen tüm kayıtlar temizlendi.");
  }
}

cleanup();
