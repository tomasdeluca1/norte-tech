# Pitch deck para sponsors — `/pitch-deck`

**Fecha:** 2026-06-23
**Estado:** Diseño aprobado (pendiente review del spec)
**Ruta:** `nortetech.ar/pitch-deck`

## Objetivo

Una página `/pitch-deck` para presentarle Norte Tech a **sponsors** (empresas).
Muestra la info real de la comunidad y a dónde aspira, en formato **slides
navegables** (no scroll), compartible por link y exportable a PDF.

No es un deck de inversión: no vende ronda ni modelo de negocio. Vende **el valor
de la audiencia** (quiénes son los builders, su calibre, su actividad) y abre la
conversación de cómo una empresa puede sumarse.

## Decisiones tomadas (brainstorming)

- **Audiencia / ask:** sponsors (empresas). Foco en audiencia + beneficios.
- **Formato:** slides navegables (←/→/espacio, flechas en pantalla, dots, deep-link
  por slide). Exportable a PDF vía print stylesheet.
- **Tiers:** sin montos, nombres confirmados **Lead / Partner / Friend**. Slide de
  "formas de sumarte" con beneficios cualitativos; el número se conversa 1:1.
- **Prueba social:** sin nombrar empresas ni miembros. Todo **agregado/anónimo**
  (números, roles, verticales, geografía). No hay permisos de logos por ahora.
- **Datos:** snapshot estático curado a junio 2026 para los desgloses (roles,
  verticales, etc.). El **total de miembros es dinámico**: se trae en vivo de
  `/api/members` (campo `total`), igual que el home, con fallback al número estático.
- **Equipo:** se incluye un slide de organizadores con **Tomás Deluca, Patricio
  Iturraspe y Lucas Argento** (núcleo organizador).
- **Contacto:** `huevsite.studio@gmail.com` (confirmado).
- **Voz:** humana, castellano rioplatense, directa. **Nada de tono "AI".**

## Enfoque técnico

**Deck a mano, brand-native** (sin librerías de slides). Una ruta Next.js que
renderiza N slides full-screen y reusa los tokens de marca existentes.

Descartados: scroll-snap (elegimos slides, no scroll) y reveal.js/Spectacle
(dependencia pesada, otro sistema de estilos, cuesta clavar la marca).

### Arquitectura

```
app/pitch-deck/
  page.tsx          # Server component: metadata + render del deck
  PitchDeck.tsx     # Client component: estado de slide actual, navegación, teclado
  pitch-data.ts     # Snapshot estático: todo el contenido y números (junio 2026)
  Slide.tsx         # Wrapper de un slide (full-screen, número, layout base)
  slides/           # Un componente por slide (o un render por tipo desde pitch-data)
  pitch-deck.css    # Estilos del deck + print stylesheet (un slide por página A4/16:9)
```

- **`page.tsx`** (server): exporta `metadata` propia (title/description/OG para que
  el link compartido se vea bien; `robots: noindex` para que el deck no aparezca en
  buscadores). Renderiza `<PitchDeck/>`.
- **`PitchDeck.tsx`** (client, `'use client'`): mantiene `current` (índice de slide),
  escucha teclado (`ArrowRight`/`Space`/`PageDown` → next; `ArrowLeft`/`PageUp` →
  prev; `Home`/`End`; `f` fullscreen opcional), sincroniza con el hash (`#3`) para
  deep-link y back/forward del browser. Renderiza el slide actual + controles
  (flechas, dots, contador "3 / 13").
- **`pitch-data.ts`**: única fuente de verdad del contenido. Array de slides tipados;
  cada número viene de acá (fácil de editar sin tocar JSX).
- **Navegación:** sólo se muestra un slide a la vez en pantalla. En **print**, el CSS
  muestra **todos** los slides, uno por página.

### Export a PDF

Print stylesheet (`@media print`): cada slide ocupa una página (`break-after: page`),
se ocultan los controles de navegación, fondo oscuro forzado
(`-webkit-print-color-adjust: exact`). El usuario hace `Cmd-P → Guardar como PDF`.
Tamaño de página apaisado (`@page { size: 1280px 720px; }` o landscape A4) para
respetar el 16:9. No requiere librería.

### Reuso de marca

- Tokens de `app/globals.css`: `--bg #05070a`, `--surf #0d1217`, `--border #1a2128`,
  `--accent #00e5a0`, `--accent-2 #1ffdb6`, `--text #e6edf3`, `--muted #52626e`.
- Fuentes ya cargadas en `app/layout.tsx`: **Bebas Neue** (`.display`, títulos),
  **Space Mono** (`.mono`, labels/números), **DM Sans** (body).
- Estética: dark, grid sutil, glow verde, números grandes en Bebas. Coherente con el
  home (hero "BUILD THE FUTURE", terminal, marquee de verticales).

## Datos reales (snapshot junio 2026)

Fuente: DB de producción al 2026-06-23. Se guardan en `pitch-data.ts`.

- **Tamaño:** 163 miembros (160 activos). Crecimiento: ~6 (mar+may) → **+157 en junio
  2026**. Hockey-stick real.
- **Composición (rol):** 86 Founder/CEO · 45 Developer/Engineer · 12 Marketing/Growth
  · 8 Product/Design · 10 Otro · 2 Inversor.
- **Verticales (tags):** AI 94 · SaaS 59 · Fintech 30 · Web3 20 · Proptech, además de
  Builder/Founder/Dev como identidad. → comunidad **AI-first**.
- **Qué buscan:** Networking 70 · Feedback 32 · Talento/equipo 27 · Clientes 25 ·
  Mentoría 24 · Cofounder 21 · Inversión 14.
- **Geografía:** Tigre (varios barrios) + Vicente López 9 · San Isidro 7 · Pilar 7
  · Escobar 6 · Tigre 5 · Pacheco 4 · San Fernando 2. Eje Zona Norte.
- **Plataforma:** 29 huevsites (perfiles públicos) creados · 80 con LinkedIn · 22 con
  website propio.
- **Actividad:** primer co-work ya realizado (Islas del Golf, Tigre). Próximos:
  kick-off, "Build with AI", Hackathon #1.
- **Equipo organizador:** Tomás Deluca, Patricio Iturraspe, Lucas Argento (el rol /
  one-liner de cada uno es un campo editable en `pitch-data.ts`; no se inventa).

> Los números se redondean/enmarcan a propósito ("160+ builders", "9 de cada 10 son
> founders o devs") pero nunca se inflan. Si un número cambia mucho, se actualiza
> `pitch-data.ts`.
>
> **Total dinámico:** el número de miembros del cover y del slide de tracción se
> hidrata desde `/api/members` (`total`) en el cliente, con el número estático como
> fallback inicial / si la API falla. El resto de los desgloses queda estático.

## Estructura de slides (14)

Cada slide incluye su intención. El copy abajo es **draft en la voz correcta**
(ajustable), no placeholder.

1. **Cover** — `BUILD THE FUTURE`. Bajada: "La comunidad tech de zona
   norte." Tag mono: `Pitch para sponsors · 2026`. Logo + `nortetech.ar`.
2. **La oportunidad** — "Zona Norte está lleno de gente que construye —founders, devs,
   makers— pero hasta ahora cada uno remaba solo. No había un lugar tech que los
   junte." Cierre: "Eso es lo que estamos armando."
3. **Qué es Norte Tech** — "Una comunidad de builders que vive y trabaja en la
   zona. Sin humo: nos juntamos a construir, no a hacer networking de tarjetita."
   4 pilares (de la home): Startups & proyectos · Conocimiento · Red de contactos ·
   Acción real ("no es otro grupo de WhatsApp").
4. **Tracción** — el número grande. "De un grupo de 6 a **160+ builders en cuestión
   de semanas.**" Mini-timeline mar → may → jun. Subtítulo: "Sin pauta. Boca a boca."
5. **Quiénes son** — "No es una lista de emails." 86 founders/CEO, 45 devs, product,
   marketing. "9 de cada 10 son founders o devs." Barras simples por rol.
6. **Qué construyen** — verticales: AI 94, SaaS, Fintech, Web3, Proptech. "Una
   comunidad AI-first." Chips/marquee de verticales.
7. **De dónde son** — eje Zona Norte: Tigre, Vicente López, San Isidro, Pilar,
   Escobar, Tigre, Pacheco. "Todos a 20 minutos. Eso hace que pase en persona."
8. **Qué buscan** — "Vienen a buscar cosas concretas": Talento, Clientes, Cofounder,
   Feedback, Mentoría, Inversión. → demanda real que un sponsor puede ayudar a
   resolver.
9. **Qué hacemos** — actividad: el primer co-work ya pasó (Islas del Golf). Agenda:
   kick-off, Build with AI, Hackathon #1. "Esto recién arranca."
10. **La plataforma** — `nortetech.ar` no es sólo un grupo: dashboard, perfiles
    públicos (huevsites), directorio de builders. Producto real, presencia online.
11. **Quiénes lo organizan** — el equipo detrás: **Tomás Deluca · Patricio Iturraspe
    · Lucas Argento**. Avatares con iniciales en estilo de marca + nombre + one-liner
    editable. Mensaje: "Esto lo empuja gente que vive y construye acá."
12. **Por qué sumarte como sponsor** — qué gana la empresa: estar adentro de una
    audiencia premium de founders/devs AI-first de Zona Norte; marca en eventos y
    plataforma; acceso a talento; ver de cerca el pipeline de startups de la zona.
13. **Formas de sumarte** — 3 formas cualitativas **Lead / Partner / Friend** con
    beneficios escalonados (marca, presencia en eventos, acceso a comunidad/talento).
    **Sin precios** — "armamos el formato juntos."
14. **Hablemos** — CTA: "Si querés ser parte de esto desde el lado que construye la
    zona, hablemos." Contacto: `huevsite.studio@gmail.com` · `nortetech.ar`.

## Guía de voz (requisito explícito: que no suene a AI)

**Sí:**
- Castellano rioplatense, directo, seguro. Frases cortas.
- Tono de la home: "sin humo", "no es otro grupo de WhatsApp", "desde el agua",
  "a construir".
- Números concretos antes que adjetivos.

**No (lista negra):**
- Clichés de IA/marketing: "desbloqueá", "potenciá", "lleva X al siguiente nivel",
  "en el mundo actual", "imaginá un lugar donde", "no es sólo X, es Y" en exceso,
  "game-changer", "revolucionario", "sinergia", "ecosistema vibrante".
- Relleno corporativo y superlativos vacíos. Inglés innecesario.
- Exceso de emojis y de em-dashes. Signos de exclamación a cada línea.
- Inventar métricas o nombres. Si no hay dato, no se afirma.

## Fuera de alcance (YAGNI)

- Auth / gating: el deck es público por link (pero `noindex`).
- Lectura de DB en runtime, analítica, A/B, i18n, transiciones animadas complejas,
  speaker notes, modo presentador.
- Tiers con precios, nombres de empresas/miembros.

## Verificación

- `npm run build` compila sin errores de tipos/lint.
- Navegación: teclado (←/→/espacio/Home/End), flechas y dots cambian de slide; el
  hash refleja el slide y back/forward funciona.
- Deep-link: abrir `/pitch-deck#7` arranca en el slide 7.
- Responsive: legible en laptop (target principal) y aceptable en mobile.
- Print: `Cmd-P` genera un PDF con un slide por página, fondo oscuro, sin controles.
- Contador dinámico: el total del cover/tracción se hidrata desde `/api/members`;
  si la API falla, queda el número estático (no rompe).
- Revisión de copy contra la guía de voz (lista negra) antes de dar por cerrado.

## Open items — resueltos

1. **Contacto:** `huevsite.studio@gmail.com`. ✓
2. **Nombres de tiers:** Lead / Partner / Friend. ✓
3. **Slide de equipo:** se incluye (slide 11) con Tomás Deluca, Patricio Iturraspe,
   Lucas Argento. ✓
4. **Contador:** dinámico, como el home (`/api/members` → `total`). ✓
