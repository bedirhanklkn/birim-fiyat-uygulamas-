import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';

// Vercel ücretsiz paketindeki zaman aşımı sınırını maksimuma (60 saniye) uzatırız
export const maxDuration = 60;

// Sunucu tarafı için Supabase client - global seviyede oluşturuyoruz (her istek için yeniden oluşturmuyoruz)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: {
    fetch: fetch,
  },
});

// Tek bir chunk'ı yeniden deneme mekanizmasıyla Supabase'e gönderir
async function upsertWithRetry(chunk, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('unit_prices')
        .upsert(chunk, { onConflict: 'poz_no,yil,ay,tip,birim' })
        .select('id');

      if (error) {
        throw new Error(`Supabase hata: ${error.message} (kod: ${error.code})`);
      }
      return; // Başarılı
    } catch (err) {
      console.error(`Deneme ${attempt}/${retries} başarısız:`, err.message);
      if (attempt === retries) {
        throw err;
      }
      // Exponential backoff: 1s, 2s, 4s, 8s...
      await new Promise(resolve => setTimeout(resolve, Math.min(attempt * 1000, 5000)));
    }
  }
}

export async function POST(request) {
  try {
    // Önce Supabase bağlantısını test edelim
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase bağlantı bilgileri eksik! Vercel ayarlarından Environment Variables kontrol edin.' 
      }, { status: 500 });
    }

    // Bağlantı testi: basit bir sorgu ile veritabanına ulaşılabiliyor mu?
    try {
      const { error: testError } = await supabase
        .from('unit_prices')
        .select('id')
        .limit(1);
      
      if (testError) {
        return NextResponse.json({ 
          error: `Veritabanına bağlanılamıyor: ${testError.message}` 
        }, { status: 500 });
      }
    } catch (connErr) {
      return NextResponse.json({ 
        error: `Veritabanı bağlantı hatası: ${connErr.message}. Supabase projenizin aktif olduğundan emin olun.` 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    
    // Formdan gelen özel seçimler
    const selectedKurum = formData.get('kurum') || 'TÜİK / ÇŞB';
    const selectedAy = formData.get('ay') || 'Eylül';
    const selectedYil = parseInt(formData.get('yil'), 10) || new Date().getFullYear();
    const selectedTip = formData.get('tip') || 'Poz';

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let formattedData = [];

    if (file.name.toLowerCase().endsWith('.pdf')) {
      // PDF desteği
      if (typeof global.DOMMatrix === 'undefined') {
        global.DOMMatrix = class DOMMatrix {};
      }
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      const text = data.text;
      
      const lines = text.split('\n');
      for (const line of lines) {
        const regex = /^([\d\.-]+)\s+(.+?)\s+([A-Za-z0-9\.]+)\s+([\d\.,]+)$/;
        const match = line.trim().match(regex);
        if (match) {
          let fiyatStr = match[4].replace(/\./g, '').replace(',', '.');
          formattedData.push({
            poz_no: match[1].trim(),
            tanim: match[2].trim(),
            birim: match[3].trim(),
            fiyat: parseFloat(fiyatStr) || 0,
            kurum: selectedKurum,
            ay: selectedAy,
            yil: selectedYil,
            tip: selectedTip
          });
        }
      }

      if (formattedData.length === 0) {
        return NextResponse.json({ error: 'PDF içindeki veriler tablo formatında bulunamadı. Lütfen Excel formatında yükleyin.' }, { status: 400 });
      }

    } else {
      // Excel İşlemleri
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (!rawData || rawData.length === 0) {
        return NextResponse.json({ error: 'Excel dosyası boş veya okunamadı.' }, { status: 400 });
      }

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 4) continue;
        
        const pozNo = String(row[0] || '').trim();
        const tanim = String(row[1] || '').trim();
        const birim = String(row[2] || '').trim();
        
        if (pozNo.toLowerCase().includes('poz no')) continue;
        if (!pozNo || !tanim) continue;

        let fiyatNum = 0;
        if (typeof row[3] === 'number') {
          fiyatNum = row[3];
        } else {
          let fiyatStr = String(row[3] || '0').trim();
          fiyatStr = fiyatStr.replace(/\./g, '').replace(',', '.');
          fiyatNum = parseFloat(fiyatStr) || 0;
        }

        formattedData.push({
          poz_no: pozNo,
          tanim: tanim,
          birim: birim,
          fiyat: fiyatNum,
          kurum: selectedKurum,
          ay: selectedAy,
          yil: selectedYil,
          tip: selectedTip
        });
      }
    }

    if (formattedData.length === 0) {
      return NextResponse.json({ error: 'İşlenecek geçerli satır bulunamadı.' }, { status: 400 });
    }

    // Tekrarlanan satırları ele al: aynı poz_no+birim varsa sonuna /1, /2 ekle
    const uniqueDataMap = new Map();
    for (const item of formattedData) {
      const uniqueKey = `${item.poz_no}_${item.yil}_${item.ay}_${item.tip}_${item.birim}`;
      if (uniqueDataMap.has(uniqueKey)) {
        // Bu kombinasyon zaten var, poz_no'nun sonuna numara ekle
        let counter = 2;
        let newKey = `${item.poz_no}/${counter}_${item.yil}_${item.ay}_${item.tip}_${item.birim}`;
        while (uniqueDataMap.has(newKey)) {
          counter++;
          newKey = `${item.poz_no}/${counter}_${item.yil}_${item.ay}_${item.tip}_${item.birim}`;
        }
        item.poz_no = `${item.poz_no}/${counter}`;
        uniqueDataMap.set(newKey, item);
      } else {
        uniqueDataMap.set(uniqueKey, item);
      }
    }
    const deduplicatedData = Array.from(uniqueDataMap.values());

    // 100'erli küçük paketler halinde, her pakette hata olursa 5 kez yeniden dener
    const chunkSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < deduplicatedData.length; i += chunkSize) {
      const chunk = deduplicatedData.slice(i, i + chunkSize);
      
      try {
        await upsertWithRetry(chunk, 5);
        totalInserted += chunk.length;
      } catch (err) {
        console.error(`Chunk hatası (${totalInserted}/${deduplicatedData.length}):`, err);
        return NextResponse.json({ 
          error: `Veritabanı hatası (${totalInserted}/${deduplicatedData.length} kayıt yüklendi): ${err.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, insertedCount: totalInserted });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
