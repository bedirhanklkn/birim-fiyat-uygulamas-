'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const [kurum, setKurum] = useState('Çevre ve Şehircilik Bakanlığı');
  const [ay, setAy] = useState('Eylül');
  const [yil, setYil] = useState(new Date().getFullYear().toString());
  const [tip, setTip] = useState('Poz');

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

  const handleLogin = (e) => {
    e.preventDefault();
    // Güvenlik için şifreyi artık .env dosyasından çekiyoruz, GitHub'da gözükmeyecek.
    const gercekSifre = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (password === gercekSifre) {
      setIsAuthenticated(true);
    } else {
      setStatus({ type: 'error', message: 'Hatalı şifre' });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.pdf')) {
        setFile(selectedFile);
        setStatus({ type: '', message: '' });
      } else {
        setFile(null);
        setStatus({ type: 'error', message: 'Lütfen sadece .xlsx, .csv veya .pdf formatında dosya yükleyin.' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus({ type: 'info', message: 'Dosya yükleniyor ve işleniyor, lütfen bekleyin...' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kurum', kurum);
    formData.append('ay', ay);
    formData.append('yil', yil);
    formData.append('tip', tip);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: `Başarılı! ${result.insertedCount} adet birim fiyat sisteme eklendi/güncellendi.` });
        setFile(null);
      } else {
        setStatus({ type: 'error', message: `Hata: ${result.error}` });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Sunucuya bağlanırken bir hata oluştu.' });
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mt-8" style={{ maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', marginTop: '10vh' }}>
        <div className="card text-center">
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-6)' }}>Yönetici Girişi</h1>
          <form onSubmit={handleLogin}>
            <div className="input-group mb-4">
              <input
                type="password"
                className="input-field"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Giriş Yap</button>
          </form>
          {status.type === 'error' && (
            <div style={{ color: 'var(--color-danger)', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
              <AlertCircle size={16} /> {status.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-8 mb-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <FileSpreadsheet /> Veritabanı Güncelleme
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
          Excel veya PDF dosyasını yükleyerek birim fiyat listesini saniyeler içinde güncelleyin. (PDF işlemi tablo yapısına göre eksik okuma yapabilir, tavsiye edilen form excel'dir).
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--space-4)', 
          marginBottom: 'var(--space-6)' 
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Kurum</label>
            <select 
              className="input-field" 
              value={kurum} 
              onChange={(e) => setKurum(e.target.value)}
            >
              {kurumlar.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Ay</label>
            <select 
              className="input-field" 
              value={ay} 
              onChange={(e) => setAy(e.target.value)}
            >
              {aylar.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Yıl</label>
            <select 
              className="input-field" 
              value={yil} 
              onChange={(e) => setYil(e.target.value)}
            >
              {yillar.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Kayıt Tipi</label>
            <select 
              className="input-field" 
              value={tip} 
              onChange={(e) => setTip(e.target.value)}
              style={{ borderColor: 'var(--color-primary)', fontWeight: 600, color: 'var(--color-primary)' }}
            >
              <option value="Poz">Poz</option>
              <option value="Rayiç">Rayiç</option>
            </select>
          </div>
        </div>

        <div 
          style={{ 
            border: '2px dashed var(--color-border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: 'var(--space-8)', 
            textAlign: 'center',
            backgroundColor: file ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
            transition: 'all var(--transition-fast)'
          }}
        >
          {!file ? (
            <>
              <Upload size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto', marginBottom: 'var(--space-4)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Dosyanızı Buraya Yükleyin</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                Desteklenen formatlar: .xlsx, .csv, .pdf
              </p>
              <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                Dosya Seç
                <input type="file" style={{ display: 'none' }} accept=".xlsx, .csv, .pdf" onChange={handleFileChange} />
              </label>
            </>
          ) : (
            <>
              <FileSpreadsheet size={48} style={{ color: 'var(--color-success)', margin: '0 auto', marginBottom: 'var(--space-4)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Seçilen Dosya:</h3>
              <p style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: 'var(--space-6)' }}>{file.name}</p>
              
              <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setFile(null)} disabled={uploading}>
                  İptal
                </button>
                <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? <><Loader2 className="animate-spin" /> İşleniyor...</> : <><Upload /> Yükle ve Güncelle</>}
                </button>
              </div>
            </>
          )}
        </div>

        {status.message && (
          <div style={{ 
            marginTop: 'var(--space-6)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            backgroundColor: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
            color: status.type === 'error' ? 'var(--color-danger)' : status.type === 'success' ? 'var(--color-success)' : 'var(--color-primary)'
          }}>
            {status.type === 'error' ? <AlertCircle /> : status.type === 'success' ? <CheckCircle2 /> : <Loader2 className="animate-spin" />}
            <span style={{ fontWeight: 500 }}>{status.message}</span>
          </div>
        )}

      </div>
    </div>
  );
}
