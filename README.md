# İnşaat Birim Fiyat ve Rayiç Arama Motoru 🏗️

Bu proje, inşaat mühendisleri, mimarlar ve hak ediş uzmanları için geliştirilmiş; Türkiye'deki resmi kurumların (Çevre ve Şehircilik Bakanlığı, Karayolları, DSİ vb.) **Birim Fiyat** ve **Rayiç** listelerini saniyeler içinde filtreleyip bulmanızı sağlayan modern bir web uygulamasıdır.

## 🌟 Öne Çıkan Özellikler

* **⚡ Anında Arama:** On binlerce poz ve rayiç arasından numara (Örn: `15.100.1001`) veya kelime (Örn: `Demir`) ile saniyeler içinde arama yapabilirsiniz.
* **🔍 Gelişmiş Filtreleme:** Arama sonuçlarınızı **Kurum, Yıl, Ay ve Kayıt Tipi (Poz / Rayiç)** bazında daraltabilirsiniz.
* **📂 Excel'den Toplu Yükleme:** Şifreli yönetici (Admin) paneli üzerinden, kurumların yayınladığı Excel dosyalarını tek tıkla sisteme aktarabilirsiniz (Tek seferde ~20.000 satır).
* **🛡️ Akıllı Veri Koruma:** Excel'den yüklenen bozuk satırları, ara başlıkları ve boş fiyatları otomatik atlar. Aynı pozun farklı birimlerini (Ton, m3) ayırt eder ve mükerrer kayıt (çiftleme) yaratmadan akıllıca günceller (Upsert).

## 🛠️ Kullanılan Teknolojiler

* **Frontend:** Next.js (App Router), React
* **Backend & Veritabanı:** Supabase (PostgreSQL)
* **Tasarım:** Vanilla CSS (Modern, duyarlı (responsive) ve şık kullanıcı arayüzü)
* **Veri İşleme:** xlsx (Excel ve veri ayrıştırma)

## 🚀 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

2. **Çevre Değişkenlerini Ayarlayın:**
   Proje ana dizininde `.env.local` adında bir dosya oluşturun ve içine Supabase bilgilerinizi ekleyin:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sizin_supabase_url_adresiniz
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sizin_supabase_anon_key_adresiniz
   ```

3. **Geliştirici Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```

4. Tarayıcınızdan [http://localhost:3000](http://localhost:3000) adresine giderek uygulamayı kullanmaya başlayabilirsiniz!

## 🔐 Yönetici (Admin) Paneli Kullanımı

Toplu Excel yüklemeleri yapmak için `http://localhost:3000/admin` adresine gidip şifrenizle giriş yapabilirsiniz.
> Yükleyeceğiniz Excel dosyalarında sütun sıralamasının tam olarak şu şekilde (A,B,C,D) olduğuna emin olun:
> `1. Poz No` | `2. Tanım` | `3. Birim` | `4. Fiyat`
