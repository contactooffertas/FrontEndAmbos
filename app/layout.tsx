import type { Metadata } from 'next';
import { Providers } from '../app/context/Providers';
import PWAManifestUpdater from '@/app/componentes/PWAManifestUpdater';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offerton - Las mejores ofertas',
  description: 'Encuentra las mejores ofertas cerca tuyo',
  viewport: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
  authors: [{ name: 'Offerton' }],
  keywords: ['ofertas', 'marketplace', 'compras online'],
  openGraph: {
    title: 'Offerton - Las mejores ofertas',
    description: 'Encuentra las mejores ofertas cerca tuyo',
    url: 'https://offerton.com',
    siteName: 'Offerton',
    locale: 'es_AR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Fuentes */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;900&display=swap"
          rel="stylesheet"
        />

        {/* Favicon */}
        <link rel="icon" href="/assets/offerton.png" type="image/jpeg" />
        <link rel="shortcut icon" href="/assets/offerton.png" type="image/jpeg" />

        {/* PWA - Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Offerton" />
        <link rel="apple-touch-icon" href="/assets/offerton-192.png" />

        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Colores */}
        <meta name="msapplication-TileColor" content="#f97316" />
        <meta name="msapplication-navbutton-color" content="#f97316" />

        {/* Otras meta tags PWA */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="description" content="Encuentra las mejores ofertas cerca tuyo en tiempo real" />
      </head>
      <body>
        {/* Componente para sincronizar cambios del manifest */}
        <PWAManifestUpdater />
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
