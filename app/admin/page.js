'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [kurum, setKurum] = useState('Milli Savunma Bakanlığı');
  const [yil, setYil] = useState(new Date().getFullYear().toString());
  const [ay, setAy] = useState('Ekim');
  const [tip, setTip] = useState('Poz');
  
  const [isKurumOpen, setIsKurumOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isYilOpen, setIsYilOpen] = useState(false);
  const [isAyOpen, setIsAyOpen] = useState(false);

  const kurumlar = [
    'Çevre ve Şehircilik Bakanlığı',
    'Karayolları Genel Müdürlüğü',
    'İller Bankası A.Ş. Genel Müdürlüğü',
    'Vakıflar Genel Müdürlüğü',
    'Kültür ve Turizm Bakanlığı',
    'PTT A.Ş. Genel Müdürlüğü',
    'Orman Genel Müdürlüğü',
    'Devlet Su İşleri (DSİ) Genel Müdürlüğü',
    'Türkiye Elektrik Dağıtım A.Ş. (TEDAŞ)',
    'Ulaştırma ve Altyapı Bakanlığı',
    'Milli Savunma Bakanlığı'
  ];

  const yillar = [
    '2035', '2034', '2033', '2032', '2031', '2030', '2029', '2028',
    '2027', '2026', '2025', '2024', '2023', '2022'
  ];
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const tipler = ['Poz', 'Rayiç'];

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'mevkan1221') {
      setIsAuthenticated(true);
    } else {
      alert('Hatalı şifre');
    }
  };

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
  };

  const processFile = async () => {
    if (!file) {
      alert('Lütfen bir Excel dosyası seçin.');
      return;
    }
    
    setLoading(true);
    setStatus('Dosya okunuyor...');
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const formattedData = [];
      
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 4) continue;
        
        const pozNo = String(row[0] || '').trim();
        const tanim = String(row[1] || '').trim();
        const birim = String(row[2] || '').trim();
        
        if (pozNo.toLowerCase().includes('poz no') || pozNo.toLowerCase().includes('pozno')) continue;
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
          kurum: kurum,
          ay: ay,
          yil: parseInt(yil, 10),
          tip: tip
        });
      }

      // Tekrarlanan satırları ele al: aynı Excel dosyasının içinde aynı poz_no+birim varsa sonuna /2, /3 ekle
      const uniqueDataMap = new Map();
      for (const item of formattedData) {
        const uniqueKey = `${item.poz_no}_${item.yil}_${item.ay}_${item.tip}_${item.birim}`;
        if (uniqueDataMap.has(uniqueKey)) {
          // Bu kombinasyon dosyanın önceki satırlarında zaten var, poz_no'nun sonuna numara ekle
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
      
      setStatus(`${deduplicatedData.length} adet kayıt bulundu. Veritabanına aktarılıyor, lütfen bekleyin...`);
      
      const chunkSize = 1000;
      let successCount = 0;

      for (let i = 0; i < deduplicatedData.length; i += chunkSize) {
        const chunk = deduplicatedData.slice(i, i + chunkSize);
        
        const { error } = await supabase.from('unit_prices').upsert(chunk, { onConflict: 'poz_no,yil,ay,tip,birim' });
        
        if (error) {
          console.error("Insert error:", error);
          setStatus(`Yükleme sırasında hata oluştu: ${error.message}`);
          setLoading(false);
          return;
        }
        successCount += chunk.length;
        setStatus(`${successCount} / ${deduplicatedData.length} kayıt aktarıldı...`);
      }
      
      setStatus(`🎉 Başarılı! Toplam ${deduplicatedData.length} kayıt sisteme başarıyla eklendi.`);
      setFile(null);
    } catch (err) {
      console.error(err);
      setStatus(`Hata oluştu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <form onSubmit={handleLogin} style={{ 
          backgroundColor: '#1e293b', padding: '40px', borderRadius: '16px', display: 'flex', flexDirection: 'column', 
          gap: '20px', width: '350px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ color: '#fef3c7', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Yönetici Girişi</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px' }}>Panele erişmek için şifrenizi girin</p>
          </div>
          
          <input 
            type="password" 
            placeholder="Şifreniz" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '1rem' }}
          />
          
          <button type="submit" style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#d97706', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background-color 0.2s' }} className="hover:opacity-90">
            Giriş Yap
          </button>
          
          <Link href="/" style={{ color: '#64748b', textAlign: 'center', fontSize: '0.85rem', textDecoration: 'none', marginTop: '10px' }} className="hover:text-white">
            ← Ana Sayfaya Dön
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '40px', backgroundColor: '#0f172a', minHeight: '100vh', color: 'white',
      animation: 'fadeIn 0.6s ease-out' 
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-dropdown-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .admin-dropdown-scroll::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .admin-dropdown-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '800px', margin: '0 auto 30px auto' }}>
        <h1 style={{ color: '#fef3c7', margin: 0 }}>Yönetici Paneli</h1>
        <Link href="/" style={{ padding: '8px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', textDecoration: 'none', fontSize: '0.9rem' }}>
          Siteye Dön
        </Link>
      </div>
      
      <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '16px', border: '1px solid #334155', maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginTop: 0, color: '#e2e8f0', fontSize: '1.2rem', marginBottom: '10px' }}>Hızlı Veri Yükleme Aracı</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '30px', lineHeight: '1.5' }}>
          Önce yükleyeceğiniz verinin özelliklerini (Kurum, Yıl, Ay, Tip) seçin. Sonra sadece 
          <strong style={{ color: '#fef3c7', padding: '2px 6px', backgroundColor: '#0f172a', borderRadius: '4px', margin: '0 4px' }}>Poz No, Tanım, Birim, Fiyat</strong>
          sütunlarını içeren Excel dosyanızı seçin ve kaydedin.
        </p>

        {/* Seçenekler */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Kitap / Kurum</label>
            <div 
              onClick={() => setIsKurumOpen(!isKurumOpen)}
              className="hover:border-amber-500"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              {kurum}
              <ChevronDown size={16} color="#94a3b8" />
            </div>
            
            <div className="admin-dropdown-scroll" style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 50,
              maxHeight: '250px', overflowY: 'auto',
              opacity: isKurumOpen ? 1 : 0,
              visibility: isKurumOpen ? 'visible' : 'hidden',
              transform: isKurumOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isKurumOpen ? 'auto' : 'none',
              display: 'flex', flexDirection: 'column', padding: '4px 0'
            }}>
              {kurumlar.map(k => (
                <div 
                  key={k} 
                  onClick={() => { setKurum(k); setIsKurumOpen(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', color: k === kurum ? '#d97706' : 'white', backgroundColor: k === kurum ? 'rgba(217, 119, 6, 0.1)' : 'transparent', transition: 'background-color 0.2s', fontSize: '0.9rem' }}
                  className="hover:bg-slate-700/50"
                >
                  {k}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Poz mu, Rayiç mi?</label>
            <div 
              onClick={() => setIsTipOpen(!isTipOpen)}
              className="hover:border-amber-500"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              {tip === 'Poz' ? 'Poz (İhale Birim Fiyatı)' : 'Rayiç'}
              <ChevronDown size={16} color="#94a3b8" />
            </div>
            
            <div className="admin-dropdown-scroll" style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 50,
              maxHeight: '250px', overflowY: 'auto',
              opacity: isTipOpen ? 1 : 0,
              visibility: isTipOpen ? 'visible' : 'hidden',
              transform: isTipOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isTipOpen ? 'auto' : 'none',
              display: 'flex', flexDirection: 'column', padding: '4px 0'
            }}>
              {tipler.map(t => (
                <div 
                  key={t} 
                  onClick={() => { setTip(t); setIsTipOpen(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', color: t === tip ? '#d97706' : 'white', backgroundColor: t === tip ? 'rgba(217, 119, 6, 0.1)' : 'transparent', transition: 'background-color 0.2s', fontSize: '0.9rem' }}
                  className="hover:bg-slate-700/50"
                >
                  {t === 'Poz' ? 'Poz (İhale Birim Fiyatı)' : 'Rayiç'}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Yıl</label>
            <div 
              onClick={() => setIsYilOpen(!isYilOpen)}
              className="hover:border-amber-500"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              {yil}
              <ChevronDown size={16} color="#94a3b8" />
            </div>
            
            <div className="admin-dropdown-scroll" style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 50,
              maxHeight: '200px', overflowY: 'auto',
              opacity: isYilOpen ? 1 : 0,
              visibility: isYilOpen ? 'visible' : 'hidden',
              transform: isYilOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isYilOpen ? 'auto' : 'none',
              display: 'flex', flexDirection: 'column', padding: '4px 0'
            }}>
              {yillar.map(y => (
                <div 
                  key={y} 
                  onClick={() => { setYil(y); setIsYilOpen(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', color: y === yil ? '#d97706' : 'white', backgroundColor: y === yil ? 'rgba(217, 119, 6, 0.1)' : 'transparent', transition: 'background-color 0.2s', fontSize: '0.9rem' }}
                  className="hover:bg-slate-700/50"
                >
                  {y}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Ay</label>
            <div 
              onClick={() => setIsAyOpen(!isAyOpen)}
              className="hover:border-amber-500"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              {ay}
              <ChevronDown size={16} color="#94a3b8" />
            </div>
            
            <div className="admin-dropdown-scroll" style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 50,
              maxHeight: '200px', overflowY: 'auto',
              opacity: isAyOpen ? 1 : 0,
              visibility: isAyOpen ? 'visible' : 'hidden',
              transform: isAyOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isAyOpen ? 'auto' : 'none',
              display: 'flex', flexDirection: 'column', padding: '4px 0'
            }}>
              {aylar.map(a => (
                <div 
                  key={a} 
                  onClick={() => { setAy(a); setIsAyOpen(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', color: a === ay ? '#d97706' : 'white', backgroundColor: a === ay ? 'rgba(217, 119, 6, 0.1)' : 'transparent', transition: 'background-color 0.2s', fontSize: '0.9rem' }}
                  className="hover:bg-slate-700/50"
                >
                  {a}
                </div>
              ))}
            </div>
          </div>
          
        </div>
        
        <div style={{ border: '2px dashed #475569', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload}
            style={{ display: 'block', margin: '0 auto', color: '#cbd5e1' }}
          />
        </div>
        
        <button 
          onClick={processFile} 
          disabled={!file || loading}
          style={{ 
            width: '100%',
            padding: '16px', 
            borderRadius: '8px', 
            backgroundColor: loading || !file ? '#475569' : '#10b981', 
            color: 'white', 
            border: 'none', 
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1.05rem',
            transition: 'all 0.2s',
            boxShadow: loading || !file ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.3)'
          }}
          className={!loading && file ? "hover:opacity-90" : ""}
        >
          {loading ? 'Sisteme Aktarılıyor, Lütfen Bekleyin...' : 'VERİLERİ VERİTABANINA KAYDET'}
        </button>
        
        {status && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            borderRadius: '8px', 
            backgroundColor: status.includes('Başarılı') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(217, 119, 6, 0.1)', 
            border: `1px solid ${status.includes('Başarılı') ? '#10b981' : '#d97706'}`,
            color: status.includes('Başarılı') ? '#34d399' : '#fbbf24',
            fontWeight: 500,
            textAlign: 'center',
            fontSize: '0.95rem'
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
