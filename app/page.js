'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, Filter, Bell, Moon, Sun, Settings, ChevronDown, ChevronUp, X, Book, Hash, FileText, Info, Layers, Banknote } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pozCount, setPozCount] = useState(0);
  const [rayicCount, setRayicCount] = useState(0);

  // Filtre State'leri
  const [filterKurumlar, setFilterKurumlar] = useState([]);
  const [filterTip, setFilterTip] = useState([]);
  const [filterDonem, setFilterDonem] = useState('Tümü');
  const [hideNoPrice, setHideNoPrice] = useState(false);

  // Akordiyon (Açılır Kapanır Menü) State'leri
  const [isKitapOpen, setIsKitapOpen] = useState(true);
  const [isTurOpen, setIsTurOpen] = useState(false);
  const [isFasikulOpen, setIsFasikulOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDonemDropdownOpen, setIsDonemDropdownOpen] = useState(false);
  
  // Yeni Stateler: Tema ve Bildirim
  const [isLightMode, setIsLightMode] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  const [page, setPage] = useState(0);
  const pageSize = 35;
  
  const [dynamicDonemler, setDynamicDonemler] = useState([]);

  // Sabit listemiz (Eski veriler kaybolmasın diye)
  const baseDonemler = [
    '2026-Eylül', '2026-Ağustos', '2026-Temmuz', '2026-Haziran', '2026-Mayıs', '2026-Nisan', '2026-Mart', '2026-Şubat', '2026-Ocak',
    '2025-Aralık', '2025-Kasım', '2025-Ekim', '2025-Eylül', '2025-Ocak',
    '2024', '2023-2', '2023-1'
  ];

  // Veritabanından çekilen yeni dönemler (dynamicDonemler) ile sabit listeyi birleştir, mükerrerleri sil ve sırala
  const donemlerListesi = ['Tümü', ...Array.from(new Set([...dynamicDonemler, ...baseDonemler]))];

  const fetchPrices = async (isSearch = false, pageNum = 0) => {
    setLoading(true);
    if (isSearch && pageNum === 0) setHasSearched(true);
    else if (pageNum === 0) setHasSearched(false);

    try {
      let query = supabase.from('unit_prices').select('*');
      let pozCountQuery = supabase.from('unit_prices').select('*', { count: 'exact', head: true }).eq('tip', 'Poz');
      let rayicCountQuery = supabase.from('unit_prices').select('*', { count: 'exact', head: true }).eq('tip', 'Rayiç');

      // Apply filters to data query
      if (filterKurumlar.length > 0) query = query.in('kurum', filterKurumlar);
      if (filterTip.length > 0) query = query.in('tip', filterTip);
      if (hideNoPrice) query = query.gt('fiyat', 0);

      // Apply filters to count queries (except tip filter)
      if (filterKurumlar.length > 0) {
        pozCountQuery = pozCountQuery.in('kurum', filterKurumlar);
        rayicCountQuery = rayicCountQuery.in('kurum', filterKurumlar);
      }
      if (hideNoPrice) {
        pozCountQuery = pozCountQuery.gt('fiyat', 0);
        rayicCountQuery = rayicCountQuery.gt('fiyat', 0);
      }

      if (filterDonem && filterDonem !== 'Tümü') {
        if (filterDonem.includes('-')) {
          const parts = filterDonem.split('-');
          const yil = parseInt(parts[0], 10);
          const ay = parts[1];
          if (!isNaN(yil)) {
            query = query.eq('yil', yil);
            pozCountQuery = pozCountQuery.eq('yil', yil);
            rayicCountQuery = rayicCountQuery.eq('yil', yil);
          }
          query = query.eq('ay', ay);
          pozCountQuery = pozCountQuery.eq('ay', ay);
          rayicCountQuery = rayicCountQuery.eq('ay', ay);
        } else {
          const yil = parseInt(filterDonem, 10);
          if (!isNaN(yil)) {
            query = query.eq('yil', yil);
            pozCountQuery = pozCountQuery.eq('yil', yil);
            rayicCountQuery = rayicCountQuery.eq('yil', yil);
          }
        }
      }

      // Search terms
      const activeSearch = searchTerm.trim() || sidebarSearchTerm.trim();
      if (activeSearch) {
        query = query.or(`poz_no.ilike.%${activeSearch}%,tanim.ilike.%${activeSearch}%`);
        pozCountQuery = pozCountQuery.or(`poz_no.ilike.%${activeSearch}%,tanim.ilike.%${activeSearch}%`);
        rayicCountQuery = rayicCountQuery.or(`poz_no.ilike.%${activeSearch}%,tanim.ilike.%${activeSearch}%`);
      }

      // Execute all queries concurrently
      const [
        { data, error }, 
        { count: pCount, error: pError }, 
        { count: rCount, error: rError }
      ] = await Promise.all([
        query.range(pageNum * pageSize, (pageNum + 1) * pageSize - 1).order('fiyat', { ascending: false, nullsFirst: false }),
        pozCountQuery,
        rayicCountQuery
      ]);

      if (error) console.error('Search error:', error);
      else {
        if (pageNum === 0) setResults(data || []);
        else setResults(prev => [...prev, ...(data || [])]);
      }

      if (!pError && pCount !== null) setPozCount(pCount);
      if (!rError && rCount !== null) setRayicCount(rCount);
      
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchPrices(searchTerm.trim().length > 0 || sidebarSearchTerm.trim().length > 0, 0);
  }, [filterKurumlar, filterTip, filterDonem, hideNoPrice]); 

  // Sayfa ilk yüklendiğinde tarayıcı hafızasından (localStorage) temayı okuma
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
    }
  }, []);

  // Tema Değişikliği Effect'i (ve hafızaya kaydetme)
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  // Dinamik Bildirimleri Çekme
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('unit_prices')
          .select('kurum, yil, ay, created_at')
          .order('created_at', { ascending: false })
          .limit(1000);
          
        if (error) throw error;
        
        const uniqueUpdates = [];
        const seen = new Set();
        const extractedDonemler = new Set();
        
        if (data) {
          for (const row of data) {
            // Dönem listesine eklemek için (Yıl-Ay)
            if (row.yil && row.ay) {
              extractedDonemler.add(`${row.yil}-${row.ay}`);
            }

            // Bildirimler menüsü için (Kurum-Yıl-Ay) - Son 5 güncelleme
            const key = `${row.kurum}-${row.yil}-${row.ay}`;
            if (!seen.has(key) && uniqueUpdates.length < 5) {
              seen.add(key);
              uniqueUpdates.push({
                id: key,
                kurum: row.kurum,
                yil: row.yil,
                ay: row.ay,
                date: new Date(row.created_at)
              });
            }
          }
        }
        
        // Gelen yeni dönemleri state'e kaydet (ana sayfa açılır menüsüne otomatik eklenecek)
        // YENİ MANTIK: Gelecek/yeni ayları hızlıca yoklayarak bul (Limit 1 sorgusu ile)
        const aylarListesi = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const currentYear = new Date().getFullYear();
        const futurePeriods = [];
        for (let y = 2026; y <= currentYear + 2; y++) {
          for (let m of aylarListesi) {
            futurePeriods.push({ yil: y, ay: m });
          }
        }

        // Mevcut hardcoded listemizde olmayanları bul
        const existingBase = new Set([
          '2026-Eylül', '2026-Ağustos', '2026-Temmuz', '2026-Haziran', '2026-Mayıs', '2026-Nisan', '2026-Mart', '2026-Şubat', '2026-Ocak',
          '2025-Aralık', '2025-Kasım', '2025-Ekim', '2025-Eylül', '2025-Ocak',
          '2024', '2023-2', '2023-1'
        ]);

        const periodsToProbe = futurePeriods.filter(p => !existingBase.has(`${p.yil}-${p.ay}`));

        // Her bir yeni ay için veritabanında en az 1 kayıt var mı diye çok hızlı (limit 1) bir sorgu at
        const probePromises = periodsToProbe.map(async (p) => {
          const { data } = await supabase
            .from('unit_prices')
            .select('id')
            .eq('yil', p.yil)
            .eq('ay', p.ay)
            .limit(1);
          if (data && data.length > 0) return `${p.yil}-${p.ay}`;
          return null;
        });

        const probeResults = await Promise.all(probePromises);
        const discoveredPeriods = probeResults.filter(r => r !== null);

        // Hem önceden eklenenleri (extractedDonemler) hem de yeni keşfedilenleri birleştir
        discoveredPeriods.forEach(p => extractedDonemler.add(p));
        setDynamicDonemler(Array.from(extractedDonemler));
        
        setNotifications(uniqueUpdates);
      } catch (err) {
        console.error("Bildirimler alınırken hata:", err);
      } finally {
        setLoadingNotifications(false);
      }
    };
    
    fetchNotifications();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchPrices(true, 0);
  };

  const handleFilterUygula = () => {
    setPage(0);
    fetchPrices(true, 0);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPrices(hasSearched, nextPage);
  };

  const handleFilterTemizle = () => {
    setFilterKurumlar([]);
    setFilterTip([]);
    setHideNoPrice(false);
    setSidebarSearchTerm('');
    setSearchTerm('');
    setFilterDonem('Tümü');
  };

  const toggleKurum = (kurum) => {
    setFilterKurumlar(prev => 
      prev.includes(kurum) ? prev.filter(k => k !== kurum) : [...prev, kurum]
    );
  };

  const toggleTip = (tip) => {
    setFilterTip(prev => 
      prev.includes(tip) ? prev.filter(t => t !== tip) : [...prev, tip]
    );
  };

  return (
    <div className="app-wrapper">
      
      {/* HEADER */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
          <div className="logo">
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img 
                src="/logo.png" 
                alt="UAK Logo" 
                style={{ 
                  height: '40px', 
                  width: 'auto',
                  filter: isLightMode ? 'invert(1) hue-rotate(180deg) brightness(1.2)' : 'none',
                  transition: 'filter 0.3s ease'
                }} 
              />
            </a>
          </div>
          
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '650px', display: 'flex', position: 'relative', width: '100%' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#d97706' }} size={18} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Poz No, Eski Poz No veya Tanım İle Arama Yapın" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '48px', paddingRight: '90px', borderRadius: '30px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border)', height: '46px', width: '100%' }}
            />
            <button 
              type="submit"
              style={{
                position: 'absolute',
                right: '4px',
                top: '4px',
                bottom: '4px',
                backgroundColor: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                padding: '0 24px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                letterSpacing: '0.5px'
              }}
              className="hover:opacity-90"
            >
              Ara
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsDonemDropdownOpen(!isDonemDropdownOpen)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                padding: '0.5rem 1rem', borderRadius: '6px', 
                backgroundColor: 'var(--color-surface)', 
                border: '1px solid var(--color-border)',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {filterDonem}
              <ChevronDown size={14} color="var(--color-text-muted)" />
            </button>
            
            <div style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              width: '180px', maxHeight: '350px', overflowY: 'auto',
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              zIndex: 1000, display: 'flex', flexDirection: 'column',
              padding: '0.5rem 0',
              opacity: isDonemDropdownOpen ? 1 : 0,
              visibility: isDonemDropdownOpen ? 'visible' : 'hidden',
              transform: isDonemDropdownOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isDonemDropdownOpen ? 'auto' : 'none'
            }} className="custom-scrollbar">
              {donemlerListesi.map(donem => (
                <button 
                  key={donem}
                  onClick={() => { setFilterDonem(donem); setIsDonemDropdownOpen(false); }}
                  style={{ 
                    padding: '0.5rem 1rem', textAlign: 'left', border: 'none', background: 'none',
                    fontSize: '0.875rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', color: filterDonem === donem ? '#b45309' : 'var(--color-text)',
                    backgroundColor: filterDonem === donem ? '#fffbeb' : 'transparent',
                    transition: 'background-color 0.2s',
                    fontWeight: filterDonem === donem ? 600 : 500
                  }}
                  className="hover:bg-gray-50/10"
                >
                  {donem}
                  {filterDonem === donem && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="btn btn-outline" 
              style={{ padding: '10px', borderRadius: 'var(--radius-full)', borderColor: 'transparent', cursor: 'pointer' }} 
              title="Bildirimler"
            >
              <div style={{ position: 'relative' }}>
                <Bell size={20} color="var(--color-text)" />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--color-success)', borderRadius: '50%' }}></span>
                )}
              </div>
            </button>
            
            {/* Bildirim Menüsü */}
            <div style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              width: '340px', backgroundColor: 'var(--color-surface)', 
              border: '1px solid var(--color-border)', borderRadius: '12px', 
              boxShadow: 'var(--shadow-lg)', zIndex: 1000,
              opacity: isNotificationsOpen ? 1 : 0,
              visibility: isNotificationsOpen ? 'visible' : 'hidden',
              transform: isNotificationsOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isNotificationsOpen ? 'auto' : 'none'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)' }}>Bildirimler</h3>
                {notifications.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    {notifications.length} Yeni
                  </span>
                )}
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="custom-scrollbar">
                
                {loadingNotifications ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto' }} />
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Henüz yeni bir veri yüklenmedi.
                  </div>
                ) : (
                  notifications.map((notif, index) => {
                    const diffMins = Math.floor((new Date() - notif.date) / 60000);
                    let timeStr = "Az önce";
                    if (diffMins > 1440) timeStr = `${Math.floor(diffMins/1440)} gün önce`;
                    else if (diffMins > 60) timeStr = `${Math.floor(diffMins/60)} saat önce`;
                    else if (diffMins > 0) timeStr = `${diffMins} dakika önce`;

                    return (
                      <div key={notif.id} style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', backgroundColor: index === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent', transition: 'background-color 0.2s' }} className="hover:bg-gray-50/5">
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ width: '8px', height: '8px', backgroundColor: index === 0 ? 'var(--color-success)' : 'var(--color-text-muted)', borderRadius: '50%', marginTop: '6px' }}></div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: index === 0 ? 600 : 500 }}>Sistem Güncellendi</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              <strong style={{ color: 'var(--color-text)' }}>{notif.kurum}</strong> {notif.yil} {notif.ay} dönemi fiyatları sisteme başarıyla eklendi.
                            </p>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '8px', display: 'block' }}>{timeStr}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsLightMode(!isLightMode)}
            className="btn btn-outline" 
            style={{ padding: '10px', borderRadius: 'var(--radius-full)', borderColor: 'transparent', cursor: 'pointer' }} 
            title="Karanlık/Aydınlık Mod"
          >
            {isLightMode ? <Sun size={20} color="#d97706" /> : <Moon size={20} color="var(--color-text)" />}
          </button>

          <Link href="/admin" className="btn btn-outline" style={{ padding: '10px', borderRadius: 'var(--radius-full)', borderColor: 'transparent' }} title="Yönetici Paneli">
            <Settings size={20} color="var(--color-text-muted)" />
          </Link>
        </div>
      </header>

      <div className="app-body" style={{ position: 'relative' }}>
        
        {/* ======================= */}
        {/* FİLTRELER AÇMA BUTONU (PREMIUM TASARIM) */}
        {/* ======================= */}
        <div 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            background: 'linear-gradient(145deg, #0f172a, #1e293b)',
            borderRight: '2px solid #d97706',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: '#fef3c7',
            width: '44px',
            height: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            borderTopRightRadius: '14px',
            borderBottomRightRadius: '14px',
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: `translateY(-50%) translateX(${isSidebarOpen ? '-100px' : '0'})`,
            opacity: isSidebarOpen ? 0 : 1,
            pointerEvents: isSidebarOpen ? 'none' : 'auto',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1000,
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5), inset 1px 0 0 rgba(255,255,255,0.05)'
          }}
        >
          <Filter size={18} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 2px rgba(245, 158, 11, 0.5))' }} />
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Filtreler
          </span>
        </div>
        {/* ======================= */}
        {/* ADIM 3: SOL FİLTRE MENÜSÜ*/}
        {/* ======================= */}
        
        {/* Mobil için Sidebar Arkaplan Örtüsü (Backdrop) */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(3px)',
              zIndex: 999
            }}
            className="sidebar-backdrop"
          />
        )}
        
        <aside className="app-sidebar" style={{ 
          position: 'fixed', // Fixed so it covers the entire height including header
          top: 0,
          bottom: 0,
          left: 0,
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: 'var(--color-surface)', 
          borderRight: '1px solid var(--color-border)', 
          width: '300px', 
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          opacity: isSidebarOpen ? 1 : 0,
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000, // Very high z-index to stay above header
          boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none'
        }}>
          
          {/* Sidebar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.3)', backgroundColor: 'rgba(217, 119, 6, 0.1)', boxShadow: 'inset 0 0 10px rgba(217, 119, 6, 0.05)' }}>
                <Filter size={20} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 2px rgba(245, 158, 11, 0.5))' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>Filtreler</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sonuçları daraltın</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'var(--color-border)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Arama */}
          <div style={{ padding: '1rem 1.5rem 0.5rem 1.5rem' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Poz numarası veya tanım ara..." 
                className="input-field"
                value={sidebarSearchTerm}
                onChange={(e) => setSidebarSearchTerm(e.target.value)}
                style={{ 
                  paddingLeft: '36px', 
                  fontSize: '0.875rem', 
                  height: '42px', 
                  backgroundColor: 'transparent', 
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)'
                }}
              />
            </div>
          </div>

          {/* Toggle Switch */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '4px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>FİYATI OLMAYANLARI GİZLE</span>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{
                position: 'relative',
                width: '36px',
                height: '20px',
                backgroundColor: hideNoPrice ? '#d97706' : 'var(--color-border)',
                borderRadius: '10px',
                transition: '0.3s'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: hideNoPrice ? '18px' : '2px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  transition: '0.3s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <input 
                type="checkbox" 
                checked={hideNoPrice}
                onChange={() => setHideNoPrice(!hideNoPrice)}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Sidebar Kaydırılabilir Ortası */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="custom-scrollbar">
            
            {/* KİTAP AKORDİYON */}
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isKitapOpen ? '0.75rem' : '0' }}
                onClick={() => setIsKitapOpen(!isKitapOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '4px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>KİTAP</span>
                </div>
                {isKitapOpen ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
              </div>
              
              {isKitapOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }} className="custom-scrollbar">
                  {[
                    { ad: 'Çevre ve Şehircilik Bakanlığı', logo: '/cevre.png' },
                    { ad: 'Karayolları Genel Müdürlüğü', logo: '/kgm.png' },
                    { ad: 'İller Bankası A.Ş. Genel Müdürlüğü', logo: '/ilbank.png' },
                    { ad: 'Vakıflar Genel Müdürlüğü', logo: '/vakiflar.png' },
                    { ad: 'Kültür ve Turizm Bakanlığı', logo: '/kultur.png' },
                    { ad: 'PTT A.Ş. Genel Müdürlüğü', logo: '/ptt.png' },
                    { ad: 'Orman Genel Müdürlüğü', logo: '/ogm.png' },
                    { ad: 'Devlet Su İşleri (DSİ) Genel Müdürlüğü', logo: '/dsi.png' },
                    { ad: 'Türkiye Elektrik Dağıtım A.Ş. (TEDAŞ)', logo: '/tedas.png' },
                    { ad: 'Ulaştırma ve Altyapı Bakanlığı', logo: '/ulastirma.png' },
                    { ad: 'Milli Savunma Bakanlığı', logo: '/msb.png' }
                  ].map(kurum => (
                    <label 
                      key={kurum.ad} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        cursor: 'pointer', 
                        fontSize: '0.875rem', 
                        color: 'var(--color-text-muted)', 
                        padding: '0.4rem 0.5rem',
                        borderRadius: '6px',
                        backgroundColor: filterKurumlar.includes(kurum.ad) ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                        transition: 'background-color 0.2s'
                      }} 
                    >
                      {/* Checkbox Kutusu */}
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '3px', 
                        border: '1px solid var(--color-border)', 
                        backgroundColor: 'transparent',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {filterKurumlar.includes(kurum.ad) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={filterKurumlar.includes(kurum.ad)}
                        onChange={() => toggleKurum(kurum.ad)}
                        style={{ display: 'none' }}
                      />
                      
                      {/* Kurum Logosu */}
                      {kurum.logo ? (
                        <img src={kurum.logo} alt={kurum.ad} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '20px', height: '20px' }}></div>
                      )}
                      
                      {/* Kurum Adı */}
                      <span style={{ color: filterKurumlar.includes(kurum.ad) ? 'var(--color-text)' : 'inherit' }}>
                        {kurum.ad}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* TÜR AKORDİYON */}
            <div>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isTurOpen ? '0.75rem' : '0' }}
                onClick={() => setIsTurOpen(!isTurOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '4px', height: '16px', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>TÜR</span>
                </div>
                {isTurOpen ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
              </div>
              
              {isTurOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {['Rayiç', 'Poz'].map(tip => (
                    <label 
                      key={tip} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        cursor: 'pointer', 
                        fontSize: '0.875rem', 
                        color: 'var(--color-text-muted)', 
                        padding: '0.4rem 0.5rem',
                        borderRadius: '6px',
                        backgroundColor: filterTip.includes(tip) ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '3px', 
                        border: '1px solid var(--color-border)', 
                        backgroundColor: 'transparent',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {filterTip.includes(tip) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={filterTip.includes(tip)}
                        onChange={() => toggleTip(tip)}
                        style={{ display: 'none' }}
                      />
                      <span style={{ color: filterTip.includes(tip) ? 'var(--color-text)' : 'inherit' }}>{tip === 'Poz' ? 'İhale Birim Fiyatı' : 'Rayiç'}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Alt Butonlar */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem', backgroundColor: 'var(--color-surface)' }}>
            <button onClick={handleFilterTemizle} style={{ flex: 1, fontSize: '0.85rem', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--color-border)', color: 'var(--color-text)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21v-5h5"></path></svg> 
              Temizle
            </button>
            <button onClick={handleFilterUygula} style={{ flex: 1, fontSize: '0.85rem', padding: '10px', borderRadius: '6px', backgroundColor: '#00a896', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Uygula
            </button>
          </div>
        </aside>

        {/* ======================= */}
        {/* ADIM 4 İÇİN HAZIRLIK TABLO*/}
        {/* ======================= */}
        <main className="app-content" style={{ flex: 1, paddingLeft: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Birim Fiyat Listesi
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                {hasSearched ? `Arama Sonuçları (${results.length} kayıt)` : `Tüm pozlar gösteriliyor`}
              </p>
            </div>
            
            {/* Güncel Poz/Rayiç Sayıları */}
            <div style={{ display: 'flex', gap: '1rem' }}>
               <div style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(201, 168, 76, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gold)', minWidth: '120px', textAlign: 'center' }}>
                 <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Güncel Poz</span>
                 <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                   {new Intl.NumberFormat('tr-TR').format(pozCount)}
                 </div>
               </div>
               <div style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(201, 168, 76, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gold)', minWidth: '120px', textAlign: 'center' }}>
                 <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Güncel Rayiç</span>
                 <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                   {new Intl.NumberFormat('tr-TR').format(rayicCount)}
                 </div>
               </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center mt-8 text-muted">
              <Loader2 className="animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', color: 'var(--color-primary)' }} />
              <p className="mt-4">Veriler yükleniyor...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="table-container" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    {/* KİTAP Sütunu */}
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', width: '220px', borderRight: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Book size={16} color="#eab308" />
                          <span>KİTAP</span>
                        </div>
                        <ChevronUp size={14} color="var(--color-text-muted)" />
                      </div>
                    </th>
                    
                    {/* POZ NO Sütunu */}
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', width: '130px', borderRight: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Hash size={16} color="#3b82f6" />
                          <span>POZ NO</span>
                        </div>
                        <ChevronUp size={14} color="var(--color-text-muted)" />
                      </div>
                    </th>
                    
                    {/* TANIM Sütunu */}
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', borderRight: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="#0ea5e9" />
                          <span>TANIM</span>
                        </div>
                        <ChevronUp size={14} color="var(--color-text-muted)" />
                      </div>
                    </th>
                    
                    {/* BİRİM Sütunu */}
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', width: '100px', borderRight: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Info size={16} color="#3b82f6" />
                        <span>BİRİM</span>
                      </div>
                    </th>
                    
                    {/* BİRİM FİYAT Sütunu */}
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', width: '140px', borderRight: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Banknote size={16} color="#10b981" />
                        <span>BİRİM FİYAT</span>
                      </div>
                    </th>
                    
                    {/* TÜR Sütunu */}
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', width: '160px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={16} color="#a855f7" />
                          <span>TÜR</span>
                        </div>
                        <ChevronUp size={14} color="var(--color-text-muted)" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50/5">
                      {/* KİTAP Değeri */}
                      <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--color-border)', verticalAlign: 'middle' }}>
                        <div style={{ 
                          border: '1px solid #eab308', 
                          borderRadius: '4px', 
                          padding: '0.35rem 0.5rem', 
                          fontSize: '0.75rem', 
                          color: 'var(--color-text)', 
                          backgroundColor: 'rgba(234, 179, 8, 0.05)', 
                          textAlign: 'center',
                          lineHeight: '1.3'
                        }}>
                          {item.kurum || 'Kurum Yok'}
                        </div>
                      </td>
                      
                      {/* POZ NO Değeri */}
                      <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--color-border)', fontSize: '0.875rem', color: '#3b82f6', verticalAlign: 'middle', fontWeight: 600 }}>
                        {item.poz_no}
                      </td>
                      
                      {/* TANIM Değeri */}
                      <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text)', verticalAlign: 'middle', lineHeight: '1.5' }}>
                        {item.tanim}
                      </td>
                      
                      {/* BİRİM Değeri */}
                      <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', verticalAlign: 'middle' }}>
                        {item.birim || '-'}
                      </td>
                      
                      {/* BİRİM FİYAT Değeri */}
                      <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--color-border)', fontSize: '0.95rem', color: 'var(--color-primary)', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700 }}>
                        {item.fiyat ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.fiyat) : 'Fiyat Yok'}
                      </td>
                      
                      {/* TÜR Değeri */}
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          border: item.tip === 'Poz' ? '1px solid #16a34a' : '1px solid #eab308', 
                          backgroundColor: item.tip === 'Poz' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(234, 179, 8, 0.1)', 
                          color: item.tip === 'Poz' ? '#16a34a' : '#eab308', 
                          padding: '0.3rem 0.6rem', 
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {item.tip === 'Poz' && <FileText size={12} color="#16a34a" />}
                          {item.tip === 'Poz' ? 'İhale Birim Fiyatı' : 'Rayiç'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {results.length > 0 && results.length < pozCount + rayicCount && (
                <div style={{ marginTop: '30px', marginBottom: '30px', backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  {/* Progress Bar */}
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(results.length / (pozCount + rayicCount)) * 100}%`, backgroundColor: '#eab308', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {((results.length / (pozCount + rayicCount)) * 100) < 1 ? '<1%' : `${Math.floor((results.length / (pozCount + rayicCount)) * 100)}%`}
                    </span>
                  </div>
                  
                  {/* Button */}
                  <button 
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                      backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '6px',
                      padding: '8px 24px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(234, 179, 8, 0.4)',
                      opacity: loading ? 0.7 : 1
                    }}
                    className="hover:opacity-90 transition-opacity"
                  >
                    <ChevronDown size={16} strokeWidth={3} /> {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                  </button>
                  
                  {/* Text */}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {results.length.toLocaleString('tr-TR')} / {(pozCount + rayicCount).toLocaleString('tr-TR')} poz - {(pozCount + rayicCount - results.length).toLocaleString('tr-TR')} kaldı
                  </span>
                </div>
              )}

            </div>
          ) : (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>Seçtiğiniz kriterlere uygun poz bulunamadı.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
