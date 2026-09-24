import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'İnşaat Birim Fiyat Platformu',
  description: 'Güncel inşaat pozları ve birim fiyatları arama motoru.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <header className="app-header">
          <div className="container header-container">
            <div className="logo">
              <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <img src="/logo.png" alt="UAK Logo" style={{ height: '40px', width: 'auto' }} />
              </a>
            </div>
            <nav>
              <a href="/admin" className="btn btn-outline" style={{ fontSize: 'var(--font-size-sm)' }}>
                Yönetici Girişi
              </a>
            </nav>
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
