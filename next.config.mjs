import { readFileSync } from 'node:fs';

// Aviso (no bloquea): si falta la URL de Luma del próximo meetup o la fecha del pill,
// el build sigue y lo deja en el log. Sin las dos, la home muestra el teaser del
// próximo meetup y el CTA a Instagram (ver MEETUP_PENDING en lib/site.ts).
// Acepta la env (NEXT_PUBLIC_MEETUP_URL / NEXT_PUBLIC_MEETUP_DATE) o las constantes
// LUMA_NEXT_MEETUP_URL_PLACEHOLDER / NEXT_MEETUP_DATE_PLACEHOLDER de lib/site.ts.
{
  const site = readFileSync(new URL('./lib/site.ts', import.meta.url), 'utf8');
  const constant = (name) => (site.match(new RegExp(`export const ${name} = '([^']*)'`)) || [])[1]?.trim() || '';
  const url = process.env.NEXT_PUBLIC_MEETUP_URL?.trim() || constant('LUMA_NEXT_MEETUP_URL_PLACEHOLDER');
  const date = process.env.NEXT_PUBLIC_MEETUP_DATE?.trim() || constant('NEXT_MEETUP_DATE_PLACEHOLDER');
  const missing = [!url && 'NEXT_PUBLIC_MEETUP_URL', !date && 'NEXT_PUBLIC_MEETUP_DATE'].filter(Boolean);
  // next build carga este archivo en varios procesos: el flag en env (lo heredan) evita repetir el aviso.
  if (missing.length && !process.env.NT_MEETUP_WARNED) {
    process.env.NT_MEETUP_WARNED = '1';
    const mode = !url && !date
      ? 'la home muestra "Founders Edition · principios de noviembre" y el CTA a Instagram, sin fecha ni inscripción'
      : 'la home muestra sólo el dato que está cargado';
    console.warn(`⚠ Próximo meetup: falta ${missing.join(' y ')}; ${mode}. El build sigue.`);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
};
export default nextConfig;
