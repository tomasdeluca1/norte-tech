import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SITE_URL, THEME_TOGGLE_ENABLED } from '@/lib/site';
import DeferredAnalytics from './components/home/DeferredAnalytics';
import './tokens.css';
import './globals.css';

// Fuentes de marca self-hosted. Subset latino básico + ÁÉÍÓÚáéíóúÑñ¿¡·→ y
// rango de pesos recortado a lo que usa el sitio (pyftsubset + instancer,
// ver docs/web-v2.md). Sólo Montserrat se precarga: es la del H1 (LCP).
// Inter y Mono entran en una segunda etapa, después del load (FONTS_STAGE_2).
const montserrat = localFont({
  src: './fonts/Montserrat-latin-700.woff2',
  variable: '--font-montserrat',
  weight: '700',
  display: 'swap',
  preload: true,
});
const inter = localFont({
  src: './fonts/Inter-latin-var.woff2',
  variable: '--font-inter',
  weight: '400 700',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
});
const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono-latin-var.woff2',
  variable: '--font-jetbrains-mono',
  weight: '400 600',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

const siteUrl = SITE_URL;

const TITLE = 'Norte Tech · Encontrá tu norte.';
const DESCRIPTION =
  'La comunidad tech de zona norte. Founders, builders e inversores en la misma mesa.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'Norte Tech, zona norte, comunidad tech, startups, founders, builders, inversores, growth, marketing, creators, San Isidro, Vicente López, Tigre, Pilar, Buenos Aires',
  authors: [{ name: 'Norte Tech' }],
  alternates: { canonical: siteUrl },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon-180.png', sizes: '180x180' }],
    other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0F58DE' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: siteUrl,
    siteName: 'Norte Tech',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: 'Norte Tech · Encontrá tu norte.', type: 'image/png' },
    ],
    type: 'website',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

// Tema: oscuro por defecto; claro con data-theme="light" en <html>.
// Se aplica antes del primer paint para evitar el flash. Acepta ?theme=light|dark.
// Con THEME_TOGGLE_ENABLED = false (decisión D4) el sitio queda sólo oscuro y
// este script no se inyecta.
const THEME_INIT = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){localStorage.setItem('nt-theme',q);}var t=q||localStorage.getItem('nt-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

// Fuentes en dos etapas (crítica v2 §3.3 paso 1): hasta el load, cuerpo y mono usan
// fallbacks con la métrica ajustada (ver 'Inter Fallback' en globals.css) y Inter y
// JetBrains Mono no se piden; después del load se agrega .fonts-2 y entran.
const FONTS_STAGE_2 = `(function(){var d=document.documentElement;function go(){requestAnimationFrame(function(){d.classList.add('fonts-2')})}if(document.readyState==='complete')go();else addEventListener('load',go)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {THEME_TOGGLE_ENABLED && <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />}
        <script dangerouslySetInnerHTML={{ __html: FONTS_STAGE_2 }} />
      </head>
      <body>
        {children}
        <DeferredAnalytics />
      </body>
    </html>
  );
}
