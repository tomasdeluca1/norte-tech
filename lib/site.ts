// Constantes del sitio. Cambiá acá (o por env) el dominio y el link del meetup.

// Dominio de producción por defecto. Se puede pisar con NEXT_PUBLIC_SITE_URL.
const DEFAULT_SITE_URL = 'https://nortetech.ar';

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  // En los previews de Vercel usamos la URL del deploy para que OG y links funcionen.
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return DEFAULT_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();

// Página de Luma del próximo meetup (CTA principal). Vacía = el CTA abre el
// formulario de alta. Setear NEXT_PUBLIC_MEETUP_URL en Vercel cuando exista.
export const MEETUP_URL = process.env.NEXT_PUBLIC_MEETUP_URL?.trim() || '';

// Areabeta: hub de comunidad e innovación en zona norte donde hacemos meetups y coworks.
// Va solo como texto y link (sin logo ni dirección).
export const AREABETA_URL = 'https://www.areabeta.com.ar/';

// Badge temporal "Octubre: cowork gratis en Areabeta" en la tarjeta Cowork.
// Se muestra hasta el 31/10/2026 23:59:59 hora de Argentina (UTC-3).
// La condición se evalúa en el cliente (ver isAreabetaPromoActive), así un
// build estático no la deja congelada.
export const AREABETA_PROMO_UNTIL = '2026-11-01T02:59:59Z';

export function isAreabetaPromoActive(now: number = Date.now()): boolean {
  return now <= Date.parse(AREABETA_PROMO_UNTIL);
}
