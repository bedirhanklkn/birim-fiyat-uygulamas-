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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"></path>
                <path d="M9 8h1"></path>
                <path d="M9 12h1"></path>
                <path d="M9 16h1"></path>
                <path d="M14 8h1"></path>
                <path d="M14 12h1"></path>
                <path d="M14 16h1"></path>
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
              BirimFiyat<span>.tr</span>
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
