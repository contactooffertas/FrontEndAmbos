import type { Metadata, Viewport } from 'next';
import { Providers } from '../app/context/Providers';
import PWAManifestUpdater from './componentes/PWAManifestUpdater';
import AccessibilityEnhancer from './componentes/AccessibilityEnhancer';
import './globals.css';
import './styles/product-card-polish.css';
import './styles/affiliate-rosario-brand.css';
import './styles/seo-performance.css';


const SITE = 'https://www.rosariomarket.com.ar';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: 'Rosario Market',
  title: {
    default: 'Rosario Market | Negocios, productos y ofertas en Rosario',
    template: '%s | Rosario Market',
  },
  description:
    'Descubrí negocios, productos y ofertas de Rosario, Santa Fe. Encontrá opciones cerca tuyo y conectate con comercios locales desde un solo lugar.',
  authors: [{ name: 'Rosario Market' }],
  creator: 'Rosario Market',
  publisher: 'Rosario Market',
  category: 'marketplace local',
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
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Rosario Market | Negocios y productos cerca tuyo',
    description: 'Descubrí negocios, productos y ofertas de Rosario. Explorá comercios locales y encontrá opciones cerca tuyo.',
    url: SITE,
    siteName: 'Rosario Market',
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/assets/offerton.png', width: 512, height: 512, alt: 'Rosario Market' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rosario Market | Negocios y productos cerca tuyo',
    description: 'Descubrí negocios, productos y ofertas de Rosario.',
    images: ['/assets/offerton.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://new-backend-lovat.vercel.app" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://new-backend-lovat.vercel.app" />
        <link
          rel="preload"
          as="image"
          href="/_next/image?url=%2Fassets%2Fmonumento-hero.png&w=1920&q=72"
          media="(min-width: 621px)"
        />
        <link
          rel="preload"
          as="image"
          href="/_next/image?url=%2Fassets%2Fmonumento-hero.png&w=828&q=68"
          media="(max-width: 620px)"
        />
      </head>
      <body>
        <Providers>
          <PWAManifestUpdater />
          <AccessibilityEnhancer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
