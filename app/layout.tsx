import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import { SITE_URL } from '@/lib/site';
import './tokens.css';
import './globals.css';

// Fuentes de marca self-hosted (subset latino, variables). Ver brand-v1/BRAND.md §7.
const montserrat = localFont({
  src: './fonts/Montserrat-latin-var.woff2',
  variable: '--font-montserrat',
  weight: '100 900',
  display: 'swap',
});
const inter = localFont({
  src: './fonts/Inter-latin-var.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});
const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono-latin-var.woff2',
  variable: '--font-jetbrains-mono',
  weight: '100 800',
  display: 'swap',
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
const THEME_INIT = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){localStorage.setItem('nt-theme',q);}var t=q||localStorage.getItem('nt-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {children}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="c6d29b68-5d43-4ebf-96cb-74b8ca555a80"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XN447TYF0F"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XN447TYF0F');
          `}
        </Script>
      </body>
    </html>
  );
}
