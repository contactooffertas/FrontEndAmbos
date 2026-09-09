import type { Metadata, Viewport } from 'next';
import { Providers } from '../app/context/Providers';
import PWAManifestUpdater from './componentes/PWAManifestUpdater';
import './globals.css';
import './styles/product-card-polish.css';
import './styles/affiliate-flow-polish.css';

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
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>
        <Providers>
          <PWAManifestUpdater />
          {children}
        </Providers>
      </body>
    </html>
  );
}
