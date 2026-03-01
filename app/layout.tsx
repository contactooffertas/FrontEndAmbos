import type { Metadata } from 'next';
import { Providers } from '../app/context/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offerton - Las mejores ofertas',
  description: 'Encuentra las mejores ofertas cerca tuyo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/assets/offerton.png" type="image/jpeg" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}