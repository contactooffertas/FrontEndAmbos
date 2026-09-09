import type { Metadata, Viewport } from 'next';
import { Providers } from '../app/context/Providers';
import PWAManifestUpdater from './componentes/PWAManifestUpdater';
import './globals.css';

const SITE = 'https://www.rosariomarket.com.ar';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Rosario Market | Negocios, productos y ofertas en Rosario',
    template: '%s | Rosario Market',
  },
  description:
    'Descubrí negocios, productos y ofertas de Rosario, Santa Fe. Encontrá opciones cerca tuyo y conectate con comercios locales desde un solo lugar.',
  authors: [{ name: 'Rosario Market' }],
  creator: 'Rosario Market',
  publisher: 'Rosario Market',
  keywords: [
    'Rosario Market',
    'negocios en Rosario',
    'productos en Rosario',
    'ofertas en Rosario',
    'comercios de Rosario',
    'compras Rosario',
    'negocios cerca mío',
    'Santa Fe',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Rosario Market | Negocios y productos cerca tuyo',
    description:
      'Descubrí negocios, productos y ofertas de Rosario. Explorá comercios locales y encontrá opciones cerca tuyo.',
    url: SITE,
    siteName: 'Rosario Market',
    locale: 'es_AR',
    type: 'website',
    images: [
      {
        url: '/assets/offerton.png',
        width: 512,
        height: 512,
        alt: 'Rosario Market',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rosario Market | Negocios y productos en Rosario',
    description:
      'Encontrá negocios, productos y ofertas de Rosario cerca tuyo.',
    images: ['/assets/offerton.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f97316',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;900&display=swap"
          rel="stylesheet"
        />

        <link rel="icon" href="/assets/ofertas.webp" type="image/webp" />
        <link rel="shortcut icon" href="/assets/ofertas.webp" type="image/webp" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rosario Market" />
        <link rel="apple-touch-icon" href="/assets/ofertas.webp" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#f97316" />
        <meta name="msapplication-navbutton-color" content="#f97316" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <PWAManifestUpdater />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
