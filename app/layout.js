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
        {children}
      </body>
    </html>
  );
}
