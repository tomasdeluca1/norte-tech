# Norte Tech

Sitio de comunidad. URL del sitio en `lib/site.ts` (`SITE_URL`, por defecto https://nortetech.ar; se pisa con `NEXT_PUBLIC_SITE_URL` y en previews usa `VERCEL_URL`).

Stack: Next.js + Neon + Resend · hereda las constantes del raíz (`Projects/CLAUDE.md`).
Completar aquí lo específico: comandos no estándar, env vars clave, decisiones de arquitectura.

## Marca (brand v1)

- Fuente de verdad: guía `norte-tech-redes/brand-v1/BRAND.md`. Tokens copiados en `app/tokens.css` (`--nt-*`, oscuro por defecto, claro con `data-theme="light"` en `<html>`); `app/globals.css` sólo los mapea a los nombres del sitio. Sin Tailwind.
- Tipografías self-hosted con `next/font/local` (`app/fonts/`): Montserrat (títulos), Inter (texto), JetBrains Mono (chips y datos).
- Logos en `public/brand/norte-tech-<versión>-<dark|light>-bg.svg`; usar `app/components/BrandLogo.tsx`. `public/brand/norte-tech-horizontal.png` es el logo de los mails.
- Botones primarios en `#0F58DE` con texto blanco (hover `#1360E6`). Nunca `#1774FD` con texto blanco.
- El nombre es "Norte Tech" (sin artículo). No usar el nombre anterior en nada visible.
- CTA principal: `MEETUP_URL` en `lib/site.ts` (env `NEXT_PUBLIC_MEETUP_URL`). Vacío = abre el formulario de alta.
- Legacy sin uso en la web: `marketing/hero-video` (video con el logo anterior), `marketing/assets-generator`, `marketing/legacy/`.
