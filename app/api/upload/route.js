import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
const pdf = require('pdf-parse');

export async function POST(request) {
  try {
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
      const data = await pdf(buffer);
      const text = data.text;
      
      // PDF'ten satırları ayıklama
      const lines = text.split('\n');
      for (const line of lines) {
        // Basit bir regex: Satır başında bir poz numarası (örn: 15.100.1001 veya 15.100), ardından tanım, birim ve son olarak fiyat
        // Örnek: "15.100.1001   C25 Hazır Beton   M3   2500,50"
        const regex = /^([\d\.-]+)\s+(.+?)\s+([A-Za-z0-9\.]+)\s+([\d\.,]+)$/;
        const match = line.trim().match(regex);
        if (match) {
          let fiyatStr = match[4].replace(/\./g, '').replace(',', '.'); // 2.500,50 -> 2500.50
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
      // Bu sayede başlık isimlerine (örn: "TÜİK Endeksleriyle...") bağımlı kalmıyoruz.
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (!rawData || rawData.length === 0) {
        return NextResponse.json({ error: 'Excel dosyası boş veya okunamadı.' }, { status: 400 });
      }

      // İlk satır muhtemelen "2026 EYLÜL AYI GÜNCEL BİRİM FİYAT LİSTESİ" gibi bir başlık.
      // İkinci satır ise "Poz No", "Tanım", vb. kolon isimleri.
      // Verilerin başladığı satırı bulalım (ilk hücresi nokta içeren sayı olan satır)
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 4) continue;
        
        const pozNo = String(row[0] || '').trim();
        const tanim = String(row[1] || '').trim();
        const birim = String(row[2] || '').trim();
        let fiyatStr = String(row[3] || '0').trim();
        
        // Eğer bu satır başlık satırıysa (örn: "Poz No" yazıyorsa) atla
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

    // Excel içinde aynı poz numarası (FARKLI BİRİMLER HARİÇ) birden fazla kez yazılmışsa hata vermemesi için
    // verileri eşsiz hale getiriyoruz. (poz_no, yil, ay, tip, birim kombinasyonu eşsiz olmalı)
    const uniqueDataMap = new Map();
    for (const item of formattedData) {
      const uniqueKey = `${item.poz_no}_${item.yil}_${item.ay}_${item.tip}_${item.birim}`;
      uniqueDataMap.set(uniqueKey, item);
    }
    const deduplicatedData = Array.from(uniqueDataMap.values());

    // Supabase'e Kaydetme (Vercel ve Supabase sınırlarına takılmamak için 1000'erli paketler halinde yüklüyoruz)
    const chunkSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < deduplicatedData.length; i += chunkSize) {
      const chunk = deduplicatedData.slice(i, i + chunkSize);
      
      const { error } = await supabase
        .from('unit_prices')
        .upsert(chunk, { onConflict: 'poz_no,yil,ay,tip,birim' });

      if (error) {
        console.error('Supabase error on chunk:', error);
        return NextResponse.json({ error: 'Veritabanına kaydedilirken hata oluştu: ' + error.message }, { status: 500 });
      }
      
      totalInserted += chunk.length;
    }

    return NextResponse.json({ success: true, insertedCount: totalInserted });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
