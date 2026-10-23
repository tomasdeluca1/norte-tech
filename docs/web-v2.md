# Home v2 (iteración de diseño de Marketing, 22/10/2026)

Spec: `marketing-contenido/norte-tech-redes/web-iteracion-v2/DISENO-ITERACION.md` (fuera del repo).

## Dónde está cada cosa

- `app/page.tsx`: Server Component (`revalidate = 300`). Islas cliente: `Hero3D` (brújula),
  `CategoryChips`, `CountUp`, `Terminal`, `CtaNeedle`, `CommunityDirectory`, `SiteNav`,
  `JoinModal`, `Reveal`, `CompassCursor`, `FooterCompass`.
- `app/home.css`: sistema v2 (tipografía de 7 tamaños, espaciado, botones, estados). Todo bajo `.v2`.
- `lib/stats.ts`: totales por categoría desde Neon (sólo agregados). Lo usan la home y `/api/members/stats`.
  Si la consulta falla, la home oculta el contador y los números de los chips.
- `public/meetups/`: fotos del Meet & Talk 02 y coworks, ya tratadas (color, sat 0,84, contraste 1,06,
  sombras hacia #0A3A94, grano). Se sirven con `next/image` + blur.

## Decisiones (en `lib/site.ts`, cambiar ahí)

| Constante | Default | Qué hace |
|---|---|---|
| `HERO_B_ENABLED` | `false` | `true` vuelve a habilitar `?hero=b` (constelación) |
| `COMPASS_CURSOR` | `'hero'` | `'off'` = cursor del sistema en todo el sitio |
| `THEME_TOGGLE_ENABLED` | `false` | `true` vuelve el toggle y el tema claro |
| `NAV_MEETUPS_LINK` | `true` | link "Meetups" en barra y footer |
| `FOTOS_FACT_REQUESTS` | `'+160'` | dato validado por Marketing; vacío lo oculta |
| `COMPASS_CURSOR` (ronda 2) | `'off'` | D3: sin cursor brújula; `'hero'` lo vuelve sólo en el hero |
| `GA4_MODE` | `'deferred'` | D-B: GA4 se carga con la primera interacción o a los 5 s, igual que Umami; `'off'` = sólo Umami |
| `TERMINAL_ON_MOBILE` | `false` | D-C: terminal de "Qué es" oculta en <= 560 px |
| `HERO_CHIP_COUNTS` | `false` | D-A: chips del hero sin número por categoría (el único número es el total) |

## Próximo meetup sin evento (reemplaza N0-2)

El build ya no se corta. `next.config.mjs` deja un aviso en el log si falta la URL de Luma
(`NEXT_PUBLIC_MEETUP_URL` o `LUMA_NEXT_MEETUP_URL_PLACEHOLDER`) o la fecha del pill
(`NEXT_PUBLIC_MEETUP_DATE` o `NEXT_MEETUP_DATE_PLACEHOLDER`).

- Faltan las dos (`MEETUP_PENDING` en `lib/site.ts`): la home no muestra fecha ni botón de
  inscripción. El pill dice `NEXT_MEETUP_TEASER` ("Founders Edition · principios de noviembre") y
  todos los CTA del meetup dicen `FOLLOW_CTA_LABEL` ("Seguinos y te avisamos la fecha") y van a
  `FOLLOW_URL` (Instagram).
- Están las dos: la home de siempre (pill con fecha, CTA a Luma, cuenta regresiva).
- Hay una sola: se muestra sólo el dato cargado (como antes).

## LCP mobile

- Fuentes en dos etapas: Montserrat (sólo 700, 17 KB) precargada para el H1; Inter y JetBrains
  Mono se piden después del `load` (clase `fonts-2`, script en `app/layout.tsx`). Hasta entonces el
  cuerpo usa `'Inter Fallback'` (Arial con la métrica de Inter, `globals.css`): CLS 0.
- Analytics con `DeferredAnalytics` (primera interacción o 5 s después del load).
- Directorio a demanda (`IntersectionObserver`, 800 px antes de entrar).
- `content-visibility: auto` en las secciones debajo de Fotos; antes de saltar a un ancla se apaga
  (`cv-off`, ver `Reveal.tsx`) para que el destino caiga bien.
- Fotos sin `placeholder="blur"`.
- Medición: `npm run lhci` (build + 5 corridas mobile de Lighthouse CI contra `next start`, asserts
  con el PEOR run: LCP < 2,4 s, CLS < 0,02, a11y >= 0,95). Config en `lighthouserc.json`.

## Placeholders pendientes (Tomás)

- `LUMA_NEXT_MEETUP_URL_PLACEHOLDER`: URL de Luma del próximo meetup (o `NEXT_PUBLIC_MEETUP_URL`).
  Vacía = los CTA abren el formulario de alta. No linkear Luma de eventos pasados.
- `MEET_TALK_01_DATE_PLACEHOLDER`: fecha "DD.MM" del Meet & Talk 01 (vacía = sin fecha en la ruta).
- `NEXT_PUBLIC_MEETUP_DATE` (ISO, o `NEXT_MEETUP_DATE_PLACEHOLDER`): fecha del pill del hero y de la ruta. Sin ésta ni la URL, la home muestra el teaser y el CTA a Instagram.

## Fuentes

`app/fonts/*.woff2` están subseteadas (latín básico + Latin-1 + → ↗ · ¿ ¡) e instanciadas al rango
de pesos que se usa: Montserrat 700 (estática), Inter 400-700 (opsz fijo 14), JetBrains Mono 400-600.
Para regenerar desde las variables completas de brand-v1:

```
pyftsubset IN.woff2 --unicodes="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2190-2193,U+2197,U+2713" \
  --layout-features='kern,liga,calt,tnum,ss01,cv11,case' --flavor=woff2 --output-file=sub.woff2
python3 -c "from fontTools.ttLib import TTFont; from fontTools.varLib import instancer as I; \
  t=I.instantiateVariableFont(TTFont('sub.woff2'), {'wght': (600, 800)}); t.flavor='woff2'; t.save('OUT.woff2')"
```
