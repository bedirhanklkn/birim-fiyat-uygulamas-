'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, Filter } from 'lucide-react';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filtre State'leri
  const [filterKurum, setFilterKurum] = useState('');
  const [filterAy, setFilterAy] = useState('');
  const [filterYil, setFilterYil] = useState(new Date().getFullYear().toString());
  const [filterTip, setFilterTip] = useState('');

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

  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const yillar = [
    '2024', '2025', '2026', '2027', '2028',
    '2029', '2030', '2031', '2032', '2033',
    '2034', '2035'
  ];

  // Veri çekme fonksiyonu (hem ilk açılış hem de arama için ortak)
  const fetchPrices = async (isSearch = false) => {
    setLoading(true);
    if (isSearch) setHasSearched(true);
    else setHasSearched(false);

    try {
      let query = supabase.from('unit_prices').select('*');

      // Seçili filtrelere göre sorguyu daraltma
      if (filterKurum) query = query.eq('kurum', filterKurum);
      if (filterAy) query = query.eq('ay', filterAy);
      if (filterYil) query = query.eq('yil', parseInt(filterYil, 10));
      if (filterTip) query = query.eq('tip', filterTip);

      // Kelime araması
      if (searchTerm.trim()) {
        query = query.or(`poz_no.ilike.%${searchTerm}%,tanim.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Search error:', error);
      } else {
        setResults(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde veya filtreler/arama değiştiğinde veriyi getir
  useEffect(() => {
    fetchPrices(searchTerm.trim().length > 0);
  }, [filterKurum, filterAy, filterYil, filterTip]); 
  // Sadece filtreler değiştiğinde otomatik getirsin. Arama kelimesi için butona basılmasını bekleyelim.

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPrices(true);
  };

  return (
    <div className="container mt-8 mb-8">
      <div className="text-center mb-8">
        <h1 style={{ fontSize: 'var(--font-size-4xl)', marginBottom: 'var(--space-2)' }}>
          Güncel İnşaat Birim Fiyatları
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)' }}>
          Poz numarası, malzeme adı veya kurum filtreleriyle arama yapın.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', marginBottom: 'var(--space-8)' }}>
        
        {/* Filtreleme Alanı */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: 'var(--space-4)', 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              <Filter size={14} /> Kurum Kitabı
            </label>
            <select className="input-field" value={filterKurum} onChange={(e) => setFilterKurum(e.target.value)}>
              <option value="">Tümü</option>
              {kurumlar.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Ay</label>
            <select className="input-field" value={filterAy} onChange={(e) => setFilterAy(e.target.value)}>
              <option value="">Tümü</option>
              {aylar.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Yıl</label>
            <select className="input-field" value={filterYil} onChange={(e) => setFilterYil(e.target.value)}>
              <option value="">Tümü</option>
              {yillar.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)' }}>Kayıt Tipi</label>
            <select className="input-field" value={filterTip} onChange={(e) => setFilterTip(e.target.value)} style={{ fontWeight: 600 }}>
              <option value="">Tümü (Poz + Rayiç)</option>
              <option value="Poz">Sadece Pozlar</option>
              <option value="Rayiç">Sadece Rayiçler</option>
            </select>
          </div>
        </div>

        {/* Arama Alanı */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div className="input-group" style={{ flexGrow: 1 }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Örn: 15.100.1001 veya Demir" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Ara
          </button>
        </form>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-xl)' }}>
          {hasSearched ? `Arama Sonuçları (${results.length})` : `Örnek Pozlar (${results.length})`}
        </h2>

        {loading ? (
          <div className="text-center mt-8 text-muted">
            <Loader2 className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', color: 'var(--color-primary)' }} />
            <p className="mt-4">Yükleniyor...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Poz No</th>
                  <th>Tanım</th>
                  <th>Birim</th>
                  <th>Birim Fiyat</th>
                  <th>Kurum</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                      {item.poz_no}
                      {item.tip === 'Rayiç' && (
                        <span style={{ 
                          display: 'inline-block', 
                          marginLeft: '8px', 
                          padding: '2px 6px', 
                          fontSize: '11px', 
                          backgroundColor: 'var(--color-secondary)', 
                          color: '#fff', 
                          borderRadius: '4px' 
                        }}>
                          Rayiç
                        </span>
                      )}
                    </td>
                    <td>{item.tanim}</td>
                    <td>
                      <span className="badge badge-primary">{item.birim}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.fiyat)}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {item.kurum} <br/> 
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {item.ay ? `${item.ay} ` : ''}{item.yil}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Seçtiğiniz kriterlere uygun poz bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
