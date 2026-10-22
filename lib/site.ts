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
