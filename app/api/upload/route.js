import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';

// Vercel ücretsiz paketindeki zaman aşımı sınırını maksimuma (60 saniye) uzatırız
export const maxDuration = 60;

// Sunucu tarafı için ayrı bir Supabase client oluşturuyoruz
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase bağlantı bilgileri eksik. Lütfen Environment Variables ayarlarını kontrol edin.');
  }
  
  return createClient(url, key);
}

// Tek bir chunk'ı yeniden deneme mekanizmasıyla Supabase'e gönderir
async function upsertWithRetry(supabase, chunk, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase
        .from('unit_prices')
        .upsert(chunk, { onConflict: 'poz_no,yil,ay,tip,birim' });

      if (error) {
        throw error;
      }
      return; // Başarılı, fonksiyondan çık
    } catch (err) {
      if (attempt === retries) {
        throw err; // Son deneme de başarısız olduysa hatayı fırlat
      }
      // Bir sonraki denemeden önce kısa bir süre bekle (500ms, 1000ms, 1500ms...)
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    
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
        return NextResponse.json({ error: 'PDF içindeki veriler tablo formatında bulunamadı veya anlaşılamadı. Lütfen verileri Excel formatında yükleyin.' }, { status: 400 });
      }

    } else {
      // Excel İşlemleri
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // header: 1 ile veriyi dizi içinde diziler (array of arrays) olarak okuyoruz.
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
        
        // Eğer bu satır başlık satırıysa atla
        if (pozNo.toLowerCase().includes('poz no')) continue;
        
        // Eğer poz no boşsa atla
        if (!pozNo || !tanim) continue;

        // Fiyatı formatlama
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

    // Excel içinde aynı poz numarası birden fazla kez yazılmışsa hata vermemesi için
    // verileri eşsiz hale getiriyoruz. (poz_no, yil, ay, tip, birim kombinasyonu eşsiz olmalı)
    const uniqueDataMap = new Map();
    for (const item of formattedData) {
      const uniqueKey = `${item.poz_no}_${item.yil}_${item.ay}_${item.tip}_${item.birim}`;
      uniqueDataMap.set(uniqueKey, item);
    }
    const deduplicatedData = Array.from(uniqueDataMap.values());

    // Supabase'e Kaydetme - 200'erli küçük paketler halinde, her pakette hata olursa 3 kez yeniden dener
    const chunkSize = 200;
    let totalInserted = 0;

    for (let i = 0; i < deduplicatedData.length; i += chunkSize) {
      const chunk = deduplicatedData.slice(i, i + chunkSize);
      
      try {
        await upsertWithRetry(supabase, chunk, 3);
        totalInserted += chunk.length;
      } catch (err) {
        console.error(`Chunk ${i / chunkSize + 1} hatası:`, err);
        return NextResponse.json({ 
          error: `Veritabanına kaydedilirken hata oluştu (${totalInserted}/${deduplicatedData.length} kayıt yüklendi): ${err.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, insertedCount: totalInserted });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
