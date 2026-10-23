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

// ─────────────────────────────────────────────────────────────────────────
// PLACEHOLDER (pendiente de Tomás): URL de Luma del PRÓXIMO meetup.
// Es el único lugar donde se carga. Pegar acá la URL (o setear
// NEXT_PUBLIC_MEETUP_URL en Vercel, que tiene prioridad). Vacía = todos los
// CTA "Sumate al próximo meetup" abren el formulario de alta.
// No linkear páginas de Luma de eventos pasados (sus descripciones todavía
// nombran la marca anterior).
// ─────────────────────────────────────────────────────────────────────────
export const LUMA_NEXT_MEETUP_URL_PLACEHOLDER = '';
export const MEETUP_URL = process.env.NEXT_PUBLIC_MEETUP_URL?.trim() || LUMA_NEXT_MEETUP_URL_PLACEHOLDER;

// PLACEHOLDER (pendiente de Tomás): fecha del Meet & Talk 01 para la ruta de
// la Agenda, en formato "DD.MM" (ej. "05.08"). Vacía = la parada se muestra
// sin fecha.
export const MEET_TALK_01_DATE_PLACEHOLDER = '';

// ─── Decisiones de diseño v2 (Marketing; Tomás puede cambiarlas) ─────────
// D2 · Hero: sólo el A corregido. true = vuelve a habilitar ?hero=b (constelación).
export const HERO_B_ENABLED = false;
// D3 · Cursor de brújula: 'off' (default de Marketing, ronda 2) = cursor del sistema en todo el sitio;
// 'hero' = vuelve el cursor brújula sólo dentro del hero.
export const COMPASS_CURSOR: 'hero' | 'off' = 'off';
// D4 · Tema: false = sólo oscuro y sin toggle (el código del claro queda). true = vuelve el toggle.
export const THEME_TOGGLE_ENABLED = false;
// D7 · Asistentes de Luma: no se muestran (sólo datos validados).
// D8 · "Meetups" en la barra: true = link a la sección de fotos.
export const NAV_MEETUPS_LINK = true;
// D-B · Google Analytics 4: 'deferred' = se carga con la primera interacción o a los 5 s del load
// (igual que Umami); 'off' = sólo Umami.
export const GA4_MODE: 'deferred' | 'off' = 'deferred';
export const GA4_ID = 'G-XN447TYF0F';
export const UMAMI_WEBSITE_ID = 'c6d29b68-5d43-4ebf-96cb-74b8ca555a80';
// D-C · Terminal de "Qué es" en mobile (<= 560 px): false = oculta (default); true = visible.
export const TERMINAL_ON_MOBILE = false;
// D-A · Números por categoría en los chips del hero: false = sólo el total (default);
// true = vuelve "Founders 121" etc.
export const HERO_CHIP_COUNTS = false;

// Datos de la sección de fotos validados por Marketing (no salen de Neon).
// Vacío = se oculta el dato.
export const FOTOS_FACT_REQUESTS = '+160';

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

// Fecha del próximo meetup (ISO 8601, ej. 2026-11-12T19:00:00-03:00). Vacía =
// sin cuenta regresiva (la fecha está en Luma). Setear NEXT_PUBLIC_MEETUP_DATE
// en Vercel junto con NEXT_PUBLIC_MEETUP_URL cuando exista el evento.
// PLACEHOLDER (pendiente de Tomás): también se puede pegar acá en vez de la env.
export const NEXT_MEETUP_DATE_PLACEHOLDER = '';
export const MEETUP_DATE = process.env.NEXT_PUBLIC_MEETUP_DATE?.trim() || NEXT_MEETUP_DATE_PLACEHOLDER;

// Próximo meetup sin evento todavía. Si faltan las DOS (URL de Luma y fecha), la
// home no muestra fecha ni botón de inscripción: muestra NEXT_MEETUP_TEASER y el
// CTA FOLLOW_CTA_LABEL hacia FOLLOW_URL. El build no falla, sólo avisa en el log
// (ver next.config.mjs). Con las dos cargadas, la home es la de siempre.
export const NEXT_MEETUP_TEASER = 'Founders Edition · principios de noviembre';
export const FOLLOW_URL = 'https://instagram.com/nortetech_ar';
export const FOLLOW_CTA_LABEL = 'Seguinos y te avisamos la fecha';
export const MEETUP_PENDING = !MEETUP_URL && !MEETUP_DATE;
