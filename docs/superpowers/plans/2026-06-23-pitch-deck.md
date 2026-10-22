# Pitch Deck (`/pitch-deck`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un pitch deck de sponsors navegable por slides en `/pitch-deck`, brand-native, con datos reales y total de miembros en vivo.

**Architecture:** Ruta Next.js (app router) `app/pitch-deck/`. `page.tsx` (server) setea metadata `noindex` y renderiza `<PitchDeck/>` (client). `PitchDeck.tsx` maneja navegación (teclado/flechas/dots/hash) y hidrata el total de miembros desde `/api/members`. El contenido y los números viven en `pitch-data.ts`; los slides en `slides.tsx`. Estilos + print-to-PDF en `pitch-deck.css`. Lógica de índice pura en `nav.ts`.

**Tech Stack:** Next.js 14 (app router), React 18, TypeScript 5.3. Fuentes ya cargadas en `app/layout.tsx` (Bebas Neue, Space Mono, DM Sans). Sin librerías nuevas. Sin test runner en el repo → verificación por `npm run build` (typecheck/lint) + browser + print.

## Global Constraints

- **Sin dependencias nuevas.** Reusar tokens de `app/globals.css` y fuentes de `app/layout.tsx`.
- **Tokens de marca:** `--accent #00e5a0`, `--accent-2 #1ffdb6`, `--bg #05070a`, `--surf #0d1217`, `--border #1a2128`, `--text #e6edf3`, `--muted #52626e`. Fuentes: Bebas Neue (`.display`/títulos), Space Mono (`.mono`/labels), DM Sans (body).
- **Ruta pública pero `noindex`** (no debe aparecer en buscadores).
- **Datos:** desgloses estáticos (snapshot junio 2026) en `pitch-data.ts`. **Total de miembros dinámico** desde `/api/members` (`data.total`), con fallback estático.
- **Sin nombres de empresas/miembros** (salvo el equipo organizador). Sin precios en tiers.
- **Voz humana, NO AI.** Prohibido: "desbloqueá", "potenciá", "al siguiente nivel", "en el mundo actual", "imaginá un lugar", "game-changer", "revolucionario", "sinergia", "ecosistema vibrante", inglés innecesario, exceso de emojis/exclamaciones, em-dashes en exceso, métricas inventadas.
- **14 slides** según el spec `docs/superpowers/specs/2026-06-23-pitch-deck-design.md`.

---

## File Structure

- `app/pitch-deck/page.tsx` — server component: metadata (noindex) + render de `<PitchDeck/>`.
- `app/pitch-deck/PitchDeck.tsx` — client: estado de slide, navegación, hidratación del total.
- `app/pitch-deck/nav.ts` — helpers puros de índice/hash (clamp, parseHash, hashFor).
- `app/pitch-deck/pitch-data.ts` — snapshot estático (números + copy + equipo + tiers + contacto).
- `app/pitch-deck/slides.tsx` — array de 14 slides (JSX), consume `pitch-data.ts`.
- `app/pitch-deck/pitch-deck.css` — estilos del deck + `@media print` (un slide por página).

---

## Task 1: Datos estáticos + helper de navegación

**Files:**
- Create: `app/pitch-deck/pitch-data.ts`
- Create: `app/pitch-deck/nav.ts`

**Interfaces:**
- Produces (`pitch-data.ts`): `SNAPSHOT_LABEL: string`, `MEMBERS_FALLBACK: number`, `ROLES`, `VERTICALS`, `LOOKING_FOR: {label:string;n:number}[]`, `GEOGRAPHY: string[]`, `PLATFORM: {huevsites:number;linkedin:number;websites:number}`, `GROWTH: {label:string;n:number}[]`, `TEAM: {name:string;initials:string;role:string}[]`, `TIERS: {name:string;tagline:string;perks:string[]}[]`, `CONTACT: {email:string;site:string}`.
- Produces (`nav.ts`): `clampIndex(i:number,total:number):number`, `parseHash(hash:string,total:number):number`, `hashFor(index:number):string`.

- [ ] **Step 1: Crear `app/pitch-deck/pitch-data.ts`**

```ts
// Snapshot de la comunidad a junio 2026 (datos reales de la DB de producción).
// El TOTAL de miembros se hidrata en vivo desde /api/members; este número es el fallback.
export const SNAPSHOT_LABEL = 'Datos a junio 2026';
export const MEMBERS_FALLBACK = 160; // miembros activos al 2026-06-23

export const GROWTH = [
  { label: 'mar', n: 4 },
  { label: 'may', n: 6 },
  { label: 'jun', n: 160 },
];

export const ROLES = [
  { label: 'Founder / CEO', n: 86 },
  { label: 'Dev / Engineer', n: 45 },
  { label: 'Marketing / Growth', n: 12 },
  { label: 'Otro', n: 10 },
  { label: 'Product / Design', n: 8 },
  { label: 'Inversor', n: 2 },
];

export const VERTICALS = [
  { label: 'AI', n: 94 },
  { label: 'SaaS', n: 59 },
  { label: 'Fintech', n: 30 },
  { label: 'Marketing', n: 26 },
  { label: 'Design', n: 21 },
  { label: 'Web3', n: 20 },
  { label: 'Proptech', n: 3 },
];

export const LOOKING_FOR = [
  { label: 'Networking', n: 70 },
  { label: 'Feedback', n: 32 },
  { label: 'Talento / equipo', n: 27 },
  { label: 'Clientes', n: 25 },
  { label: 'Mentoría', n: 24 },
  { label: 'Cofounder', n: 21 },
  { label: 'Inversión', n: 14 },
];

export const GEOGRAPHY = [
  'Tigre', 'Vicente López', 'San Isidro', 'Pilar',
  'Escobar', 'Tigre', 'General Pacheco', 'San Fernando',
];

export const PLATFORM = { huevsites: 29, linkedin: 80, websites: 22 };

export const TEAM = [
  { name: 'Tomás Deluca', initials: 'TD', role: 'Organizador' },
  { name: 'Patricio Iturraspe', initials: 'PI', role: 'Organizador' },
  { name: 'Lucas Argento', initials: 'LA', role: 'Organizador' },
];

export const TIERS = [
  {
    name: 'Lead',
    tagline: 'El sponsor principal del ciclo.',
    perks: ['Tu marca al frente de los eventos', 'Espacio para hablar en los encuentros', 'Presencia en nortetech.ar', 'Línea directa con la comunidad'],
  },
  {
    name: 'Partner',
    tagline: 'Acompañás de cerca.',
    perks: ['Marca en eventos y en la plataforma', 'Acceso a la comunidad para contratar o testear', 'Participación en una actividad por ciclo'],
  },
  {
    name: 'Friend',
    tagline: 'Bancás que esto crezca.',
    perks: ['Mención como sponsor', 'Invitaciones a los encuentros', 'Acceso al directorio de builders'],
  },
];

export const CONTACT = { email: 'huevsite.studio@gmail.com', site: 'nortetech.ar' };
```

- [ ] **Step 2: Crear `app/pitch-deck/nav.ts`**

```ts
// Lógica pura de índice de slide. 1-based en el hash (#1 = primer slide), 0-based interno.
export function clampIndex(i: number, total: number): number {
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(total - 1, Math.trunc(i)));
}

export function parseHash(hash: string, total: number): number {
  const m = /^#?(\d+)$/.exec(hash.replace(/^#/, '#'));
  if (!m) return 0;
  return clampIndex(parseInt(m[1], 10) - 1, total);
}

export function hashFor(index: number): string {
  return `#${index + 1}`;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos en `app/pitch-deck/*`.

- [ ] **Step 4: Commit**

```bash
git add app/pitch-deck/pitch-data.ts app/pitch-deck/nav.ts
git commit -m "feat(pitch-deck): datos estáticos y helper de navegación"
```

---

## Task 2: Estilos del deck + print-to-PDF

**Files:**
- Create: `app/pitch-deck/pitch-deck.css`

**Interfaces:**
- Produces: clases `.deck`, `.slide`, `.slide-no`, `.deck-nav`, `.deck-arrow`, `.deck-dots`, `.deck-dot`, `.s-eyebrow`, `.s-title`, `.s-lead`, `.s-bignum`, `.bar`, `.bar-fill`, `.chips`, `.chip`, `.team-card`, `.tier-card`, `.deck-foot`. Consumidas por `slides.tsx` y `PitchDeck.tsx`.

- [ ] **Step 1: Crear `app/pitch-deck/pitch-deck.css`** (un solo slide visible en pantalla; en print, todos, uno por página)

```css
.deck { position: fixed; inset: 0; background: var(--bg); color: var(--text);
  overflow: hidden; font-family: 'DM Sans', sans-serif; }
.deck-stage { position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; }

.slide { display: none; width: min(1100px, 92vw); max-height: 92vh; padding: 6vh 4vw;
  box-sizing: border-box; }
.slide.is-active { display: block; }
.slide-no { position: absolute; top: 24px; right: 28px; font-family: 'Space Mono', monospace;
  font-size: 12px; color: var(--muted); letter-spacing: .1em; }

.s-eyebrow { font-family: 'Space Mono', monospace; text-transform: uppercase;
  letter-spacing: .18em; font-size: 12px; color: var(--accent); margin-bottom: 18px; }
.s-title { font-family: 'Bebas Neue', sans-serif; line-height: .92; letter-spacing: .02em;
  color: #fff; font-size: clamp(40px, 7vw, 92px); margin: 0 0 18px; }
.s-lead { font-size: clamp(16px, 2.2vw, 22px); line-height: 1.55; color: var(--text-d);
  max-width: 60ch; }
.s-bignum { font-family: 'Bebas Neue', sans-serif; color: var(--accent);
  font-size: clamp(80px, 18vw, 220px); line-height: .9; }
.s-muted { color: var(--muted); }
.s-grid { display: grid; gap: 22px; margin-top: 28px; }
.s-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.s-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.s-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }

.bar-row { display: grid; grid-template-columns: 160px 1fr 48px; align-items: center;
  gap: 14px; margin: 10px 0; }
.bar-row .lbl { font-size: 14px; color: var(--text-d); }
.bar { height: 12px; background: var(--surf); border: 1px solid var(--border);
  border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-d), var(--accent)); }
.bar-row .n { font-family: 'Space Mono', monospace; font-size: 13px; color: var(--accent); text-align: right; }

.chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.chip { border: 1px solid var(--border); background: var(--surf); border-radius: 999px;
  padding: 8px 16px; font-size: 14px; color: var(--text-d); }
.chip .n { color: var(--accent); font-family: 'Space Mono', monospace; margin-left: 6px; }

.kpi { border: 1px solid var(--border); background: var(--surf); border-radius: 14px; padding: 22px; }
.kpi .v { font-family: 'Bebas Neue', sans-serif; font-size: 56px; color: var(--accent); line-height: 1; }
.kpi .k { color: var(--muted); font-size: 13px; margin-top: 6px; }

.team-card { border: 1px solid var(--border); background: var(--surf); border-radius: 14px;
  padding: 24px; text-align: center; }
.team-av { width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--accent);
  color: var(--accent); background: rgba(0,229,160,.08); display: flex; align-items: center;
  justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 28px; margin: 0 auto 14px; }
.team-card .nm { color: #fff; font-size: 18px; }
.team-card .ro { color: var(--muted); font-size: 13px; margin-top: 4px; }

.tier-card { border: 1px solid var(--border); background: var(--surf); border-radius: 14px; padding: 24px; }
.tier-card.lead { border-color: var(--accent); box-shadow: var(--accent-glow); }
.tier-card .tn { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: var(--accent); }
.tier-card .tt { color: var(--text-d); font-size: 14px; margin: 6px 0 14px; }
.tier-card ul { margin: 0; padding-left: 18px; color: var(--text-d); font-size: 14px; line-height: 1.7; }

.deck-foot { margin-top: 30px; font-family: 'Space Mono', monospace; font-size: 13px; color: var(--muted); }
.deck-foot a { color: var(--accent); text-decoration: none; }

/* Controles */
.deck-nav { position: fixed; bottom: 22px; left: 0; right: 0; display: flex; align-items: center;
  justify-content: center; gap: 16px; z-index: 5; }
.deck-arrow { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border);
  background: var(--surf); color: var(--text); cursor: pointer; font-size: 18px; }
.deck-arrow:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.deck-arrow:disabled { opacity: .35; cursor: default; }
.deck-count { font-family: 'Space Mono', monospace; font-size: 13px; color: var(--muted); min-width: 64px; text-align: center; }
.deck-dots { position: fixed; top: 50%; right: 18px; transform: translateY(-50%); display: flex;
  flex-direction: column; gap: 8px; z-index: 5; }
.deck-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); border: 0;
  cursor: pointer; padding: 0; }
.deck-dot.is-active { background: var(--accent); }
.deck-home { position: fixed; top: 20px; left: 24px; z-index: 5; font-family: 'Space Mono', monospace;
  font-size: 13px; color: var(--muted); text-decoration: none; }
.deck-home b { color: var(--accent); }

@media (max-width: 720px) {
  .s-grid.cols-2, .s-grid.cols-3, .s-grid.cols-4 { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 110px 1fr 40px; }
  .deck-dots { display: none; }
}

/* Print → un slide por página, fondo oscuro, sin controles */
@media print {
  @page { size: 1280px 720px; margin: 0; }
  html, body { background: #05070a !important; }
  .deck { position: static; overflow: visible; }
  .deck-nav, .deck-dots, .deck-home { display: none !important; }
  .deck-stage { position: static; display: block; }
  .slide { display: block !important; width: 1280px; height: 720px; max-height: none;
    page-break-after: always; break-after: page; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pitch-deck/pitch-deck.css
git commit -m "feat(pitch-deck): estilos del deck + print-to-PDF"
```

---

## Task 3: Los 14 slides (`slides.tsx`)

**Files:**
- Create: `app/pitch-deck/slides.tsx`

**Interfaces:**
- Consumes: todo `pitch-data.ts`.
- Produces: `export function buildSlides(memberTotal: number): React.ReactNode[]` — devuelve 14 nodos (uno por slide). `memberTotal` es el total ya hidratado (o fallback) para cover y tracción.

- [ ] **Step 1: Crear `app/pitch-deck/slides.tsx`** con los 14 slides. Cada slide es un `<>...</>` con `.s-eyebrow` + `.s-title` + contenido. Copy en la voz del spec (ver Global Constraints). Estructura (resumen — implementar cada uno con los datos de `pitch-data.ts`):

  1. **Cover:** `.s-title` "BUILD THE FUTURE"; `.s-lead` "La comunidad tech de zona norte."; mono tag "Pitch para sponsors · 2026"; muestra `{memberTotal}+ builders`.
  2. **La oportunidad:** eyebrow "La oportunidad"; título "ACÁ HAY MUCHA GENTE QUE CONSTRUYE"; lead: "Zona Norte está lleno de founders, devs y makers. Hasta ahora cada uno remaba solo. No había un lugar tech que los junte. Eso es lo que estamos armando."
  3. **Qué es:** eyebrow "Qué es Norte Tech"; título "TECH NACE EN ZONA NORTE"; lead: "Una comunidad de builders que vive y trabaja en la zona. Nos juntamos a construir, no a hacer networking de tarjetita."; grid cols-4 de 4 pilares (Startups & proyectos / Conocimiento / Red de contactos / Acción real).
  4. **Tracción:** eyebrow "Tracción"; `.s-bignum` `{memberTotal}+`; bajo: "builders en cuestión de semanas"; mini timeline con `GROWTH` (mar 4 → may 6 → jun 160); nota "Sin pauta. Boca a boca."
  5. **Quiénes son:** eyebrow "Quiénes son"; título "NO ES UNA LISTA DE EMAILS"; barras con `ROLES` (fill = n/86*100%); nota "9 de cada 10 son founders o devs."
  6. **Qué construyen:** eyebrow "Qué construyen"; título "UNA COMUNIDAD AI-FIRST"; chips con `VERTICALS` (label + n).
  7. **De dónde son:** eyebrow "De dónde son"; título "TODO A 20 MINUTOS"; chips con `GEOGRAPHY`; lead "Por eso pasa en persona, no sólo en un chat."
  8. **Qué buscan:** eyebrow "Qué buscan"; título "VIENEN A BUSCAR COSAS CONCRETAS"; barras con `LOOKING_FOR` (fill = n/70*100%).
  9. **Qué hacemos:** eyebrow "Qué hacemos"; título "ESTO RECIÉN ARRANCA"; grid: "Primer co-work — hecho (Islas del Golf)", "Kick-off", "Build with AI", "Hackathon #1".
  10. **La plataforma:** eyebrow "La plataforma"; título "NO ES SÓLO UN GRUPO"; grid cols-3 de KPIs con `PLATFORM` (29 perfiles públicos / 80 con LinkedIn / 22 con web); lead sobre dashboard + directorio en nortetech.ar.
  11. **Equipo:** eyebrow "Quiénes lo organizan"; título "GENTE QUE VIVE Y CONSTRUYE ACÁ"; grid cols-3 con `TEAM` (`.team-av` iniciales + nombre + rol).
  12. **Por qué un sponsor:** eyebrow "Por qué sumarte"; título "QUÉ GANÁS"; grid de 4: audiencia premium AI-first / marca en eventos y plataforma / acceso a talento / pipeline de startups de la zona.
  13. **Formas de sumarte:** eyebrow "Formas de sumarte"; título "ELEGÍ CÓMO ENTRAR"; grid cols-3 con `TIERS` (primer card `.tier-card.lead`); nota "Sin precio de lista: armamos el formato juntos."
  14. **Hablemos:** eyebrow "Hablemos"; título "SUMATE A LA QUE CONSTRUYE LA ZONA"; `.deck-foot` con `CONTACT.email` (mailto) y `CONTACT.site`.

```tsx
import React from 'react';
import {
  SNAPSHOT_LABEL, GROWTH, ROLES, VERTICALS, LOOKING_FOR, GEOGRAPHY,
  PLATFORM, TEAM, TIERS, CONTACT,
} from './pitch-data';

const PILLARS = [
  { t: 'Startups & proyectos', d: 'Founders, co-founders, early hires y primeros usuarios.' },
  { t: 'Conocimiento', d: 'Workshops, charlas de founders y Q&A.' },
  { t: 'Red de contactos', d: 'Mentores, inversores y empresas de la zona.' },
  { t: 'Acción real', d: 'No es otro grupo de WhatsApp. Construimos juntos.' },
];

function Bars({ data, max }: { data: { label: string; n: number }[]; max: number }) {
  return (
    <div>
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="lbl">{d.label}</span>
          <span className="bar"><span className="bar-fill" style={{ width: `${Math.round((d.n / max) * 100)}%` }} /></span>
          <span className="n">{d.n}</span>
        </div>
      ))}
    </div>
  );
}

export function buildSlides(memberTotal: number): React.ReactNode[] {
  return [
    // 1 — Cover
    <>
      <div className="s-eyebrow">Pitch para sponsors · 2026</div>
      <h1 className="s-title">BUILD<br />THE FUTURE</h1>
      <p className="s-lead">La comunidad tech de founders, builders e inversores de zona norte.</p>
      <div className="deck-foot">{memberTotal}+ builders · nortetech.ar</div>
    </>,
    // ... (slides 2–14 siguiendo el resumen de arriba)
  ];
}
```

  Implementar los 14 nodos completos siguiendo el resumen y reutilizando `<Bars/>`, `.chips`, `.kpi`, `.team-card`, `.tier-card`. Slide 5 usa `<Bars data={ROLES} max={86} />`; slide 8 `<Bars data={LOOKING_FOR} max={70} />`. Mostrar `SNAPSHOT_LABEL` en pie de los slides con datos (4,5,6,8,10).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores. `buildSlides` retorna 14 elementos.

- [ ] **Step 3: Commit**

```bash
git add app/pitch-deck/slides.tsx
git commit -m "feat(pitch-deck): contenido de los 14 slides"
```

---

## Task 4: Shell del deck + navegación + total dinámico + ruta

**Files:**
- Create: `app/pitch-deck/PitchDeck.tsx`
- Create: `app/pitch-deck/page.tsx`

**Interfaces:**
- Consumes: `buildSlides` (Task 3), `nav.ts` (Task 1), `MEMBERS_FALLBACK` (Task 1), `pitch-deck.css` (Task 2).
- Produces: ruta `/pitch-deck`.

- [ ] **Step 1: Crear `app/pitch-deck/PitchDeck.tsx`**

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import './pitch-deck.css';
import { buildSlides } from './slides';
import { MEMBERS_FALLBACK } from './pitch-data';
import { clampIndex, parseHash, hashFor } from './nav';

export default function PitchDeck() {
  const [memberTotal, setMemberTotal] = useState<number>(MEMBERS_FALLBACK);
  const slides = buildSlides(memberTotal);
  const total = slides.length;
  const [i, setI] = useState(0);

  // total dinámico, igual que el home
  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((d) => { if (typeof d.total === 'number' && d.total > 0) setMemberTotal(d.total); })
      .catch(() => {});
  }, []);

  // hash inicial + back/forward
  useEffect(() => {
    const sync = () => setI(parseHash(window.location.hash, total));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [total]);

  const go = useCallback((next: number) => {
    const c = clampIndex(next, total);
    setI(c);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', hashFor(c));
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(total - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, total]);

  return (
    <div className="deck">
      <a className="deck-home" href="/">NORTE <b>TECH</b></a>
      <div className="deck-stage">
        {slides.map((node, idx) => (
          <section key={idx} className={`slide${idx === i ? ' is-active' : ''}`}>
            <span className="slide-no">{String(idx + 1).padStart(2, '0')} / {total}</span>
            {node}
          </section>
        ))}
      </div>
      <div className="deck-dots">
        {slides.map((_, idx) => (
          <button key={idx} className={`deck-dot${idx === i ? ' is-active' : ''}`}
            aria-label={`Slide ${idx + 1}`} onClick={() => go(idx)} />
        ))}
      </div>
      <div className="deck-nav">
        <button className="deck-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Anterior">←</button>
        <span className="deck-count">{i + 1} / {total}</span>
        <button className="deck-arrow" onClick={() => go(i + 1)} disabled={i === total - 1} aria-label="Siguiente">→</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `app/pitch-deck/page.tsx`**

```tsx
import type { Metadata } from 'next';
import PitchDeck from './PitchDeck';

export const metadata: Metadata = {
  title: 'Norte Tech · Pitch para sponsors',
  description: 'La comunidad tech de founders, builders e inversores de zona norte.',
  robots: { index: false, follow: false },
};

export default function PitchDeckPage() {
  return <PitchDeck />;
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila; aparece la ruta `/pitch-deck` en el output. Sin errores de tipos/lint.

- [ ] **Step 4: Commit**

```bash
git add app/pitch-deck/PitchDeck.tsx app/pitch-deck/page.tsx
git commit -m "feat(pitch-deck): shell navegable + total dinámico + ruta /pitch-deck"
```

---

## Task 5: Verificación en navegador + pasada de voz + PDF

**Files:** (sin cambios de código salvo fixes que surjan)

- [ ] **Step 1: Levantar dev y verificar navegación**

Run: `npm run dev` y abrir `http://localhost:3000/pitch-deck`.
Verificar: ←/→/espacio cambian slide; flechas y dots funcionan; el hash refleja el slide (`#7`); recargar en `/pitch-deck#7` arranca en el 7; back/forward del browser navega; el contador "n / 14" es correcto.

- [ ] **Step 2: Total dinámico**

Verificar que el cover/tracción muestran el total real traído de `/api/members` (debería coincidir con el número de activos), no el fallback, una vez cargado.

- [ ] **Step 3: Print → PDF**

`Cmd-P` → "Guardar como PDF": 14 páginas, una por slide, fondo oscuro, sin controles.

- [ ] **Step 4: Pasada de copy contra la lista negra de voz**

Releer los 14 slides; eliminar cualquier término de la lista negra (ver Global Constraints). Ajustar lo que suene a AI.

- [ ] **Step 5: Build final + commit de fixes (si hubo)**

Run: `npm run build`
Expected: PASS.

```bash
git add -A && git commit -m "fix(pitch-deck): ajustes de navegación/copy tras verificación"
```

---

## Self-Review (cobertura del spec)

- Slides 1–14 del spec → Task 3 (todos). ✓
- Slides navegables (teclado/flechas/dots/hash/deep-link) → Task 4. ✓
- Print-to-PDF → Task 2 (`@media print`) + Task 5 (verificación). ✓
- Total dinámico vía `/api/members` → Task 4 Step 1. ✓
- Brand-native (tokens/fuentes) → Task 2 + Global Constraints. ✓
- Sin libs nuevas, `noindex`, sin precios, sin nombres de empresas, equipo incluido → Tasks 1–4. ✓
- Voz no-AI → Global Constraints + Task 5 Step 4. ✓
