import { readFileSync } from 'node:fs';

// N0-2 · El build de PRODUCCIÓN falla si falta la URL de Luma del próximo meetup o la
// fecha del pill. Sólo con VERCEL_ENV=production: preview y local buildean igual.
// Acepta la env (NEXT_PUBLIC_MEETUP_URL / NEXT_PUBLIC_MEETUP_DATE) o las constantes
// LUMA_NEXT_MEETUP_URL_PLACEHOLDER / NEXT_MEETUP_DATE_PLACEHOLDER de lib/site.ts.
if (process.env.VERCEL_ENV === 'production') {
  const site = readFileSync(new URL('./lib/site.ts', import.meta.url), 'utf8');
  const constant = (name) => (site.match(new RegExp(`export const ${name} = '([^']*)'`)) || [])[1]?.trim() || '';
  const url = process.env.NEXT_PUBLIC_MEETUP_URL?.trim() || constant('LUMA_NEXT_MEETUP_URL_PLACEHOLDER');
  const date = process.env.NEXT_PUBLIC_MEETUP_DATE?.trim() || constant('NEXT_MEETUP_DATE_PLACEHOLDER');
  const missing = [!url && 'NEXT_PUBLIC_MEETUP_URL (URL de Luma del próximo meetup)', !date && 'NEXT_PUBLIC_MEETUP_DATE (fecha del pill)'].filter(Boolean);
  if (missing.length) {
    throw new Error(`Build de producción bloqueado: falta ${missing.join(' y ')}. Los CTA de meetup no pueden abrir el alta de comunidad.`);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Fotos de encuentros: WebP por defecto. AVIF queda detrás de un flag apagado
    // (NEXT_IMAGE_AVIF=1) porque encodear AVIF en el optimizador cuesta CPU y latencia en el primer request.
    images: { formats: process.env.NEXT_IMAGE_AVIF === '1' ? ['image/avif', 'image/webp'] : ['image/webp'] },
};
export default nextConfig;
