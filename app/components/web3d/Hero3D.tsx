"use client";

// Capa visual del hero (A'). El texto del hero es HTML del servidor y se pinta
// primero (LCP); esto monta la brújula estática y, en desktop, cuando la
// página ya cargó y el hilo está libre, la reemplaza por la escena 3D.
// - Mobile (<= 960 px o puntero grueso): sin Three.js. Isologo SVG de 88 px
//   que gira hacia el CTA cuando lo tocás.
// - prefers-reduced-motion o sin WebGL2: brújula estática apuntando al norte.
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, type Category, type CommunityStats } from '@/lib/categories';
import { HERO_B_ENABLED } from '@/lib/site';
import { bus, CATEGORY_EVENT, screenAngle } from './bus';
import { heroVariantFromUrl, useIsCompact, useMotionMode, whenIdle } from './capabilities';
import type { SceneProps } from './CompassScene';

const COMPACT_QUERY = '(max-width: 960px), (pointer: coarse)'; // §P0-1: mobile = <= 960 px o puntero grueso

type AnyScene = ComponentType<SceneProps & { tooltip?: React.RefObject<HTMLDivElement> }>;

/** Bisel de la brújula (marca cada 10°, cardinales más largas, norte en ámbar). */
function Bezel() {
  const ticks = [];
  for (let d = 0; d < 360; d += 10) {
    const a = (d * Math.PI) / 180;
    const long = d % 90 === 0;
    const r1 = 238;
    const r2 = long ? 222 : 231;
    ticks.push(
      <line
        key={d}
        x1={(Math.sin(a) * r1).toFixed(1)} y1={(-Math.cos(a) * r1).toFixed(1)}
        x2={(Math.sin(a) * r2).toFixed(1)} y2={(-Math.cos(a) * r2).toFixed(1)}
        stroke={d === 0 ? '#FFA23A' : '#34343C'}
        strokeWidth={d === 0 ? 4 : long ? 2 : 1.2}
      />,
    );
  }
  return <g className="iso-bezel">{ticks}</g>;
}

/** Isologo de brand-v1 inline: imagen estática del hero (mobile, fallback y reduced motion). */
function StaticCompass({ needleRef }: { needleRef: React.RefObject<SVGGElement> }) {
  return (
    <svg className="hero-iso" viewBox="-300 -300 600 600" aria-hidden="true" focusable="false">
      <Bezel />
      <path className="iso-ring" d="M-56.31 -186.69A195 195 0 0 0 -32 192.36L-32 172.05A175 175 0 0 1 -67.7 -161.37ZM56.31 -186.69A195 195 0 0 1 32 192.36L32 172.05A175 175 0 0 0 67.7 -161.37Z" />
      <path className="iso-ring" d="M-255 0L-179 -15L-179 15ZM255 0L179 -15L179 15ZM0 131L14 176L0 230L-14 176Z" />
      <g ref={needleRef} className="iso-needle">
        {/* N1-5: al cargar, la aguja busca el norte una vez (CSS, no toca el LCP). */}
        <g className="iso-seek">
          <path fill="#1774FD" d="M0 -268L-125.5 11L0 -71Z" />
          <path fill="#0F58DE" d="M0 -268L125.5 11L0 -71Z" />
        </g>
      </g>
    </svg>
  );
}

export default function Hero3D({ stats }: { stats: CommunityStats | null }) {
  const mode = useMotionMode();
  const compact = useIsCompact(COMPACT_QUERY);
  const [variant, setVariant] = useState<'a' | 'b'>('a');
  const [Scene, setScene] = useState<AnyScene | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [cat, setCat] = useState<Category | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const isoNeedle = useRef<SVGGElement>(null);
  const [heroEl, setHeroEl] = useState<HTMLElement | null>(null);
  useEffect(() => { setHeroEl(stage.current?.closest('.hero') as HTMLElement | null); }, []);

  useEffect(() => { if (HERO_B_ENABLED) setVariant(heroVariantFromUrl()); }, []);
  useEffect(() => { bus.stats = stats; }, [stats]);
  useEffect(() => {
    const on = (e: Event) => setCat((e as CustomEvent<Category | null>).detail);
    window.addEventListener(CATEGORY_EVENT, on);
    return () => window.removeEventListener(CATEGORY_EVENT, on);
  }, []);

  const desktop3D = mode === 'full' && !compact;

  // Carga diferida de la escena (sólo desktop). El glow de fondo es un degradé
  // CSS (.hero-visual::before), sin un segundo contexto WebGL.
  useEffect(() => {
    if (!desktop3D) return;
    if (window.matchMedia(COMPACT_QUERY).matches) return;
    setReady(false);
    return whenIdle(() => {
      const scene = variant === 'b' ? import('./ConstellationScene') : import('./CompassScene');
      scene.then((m) => setScene(() => m.default as AnyScene)).catch(() => {});
    }, 2000);
  }, [desktop3D, variant]);

  // Puntero, CTA, rect del canvas, scroll y visibilidad -> bus (sin renders de React).
  // El rect se mide sólo en resize/scroll, nunca en cada frame.
  useEffect(() => {
    if (!desktop3D) return;
    const hero = stage.current?.closest('.hero') as HTMLElement | null;
    const cta = document.querySelector<HTMLElement>('[data-hero-cta]');
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      bus.pointer = { x: e.clientX, y: e.clientY };
      bus.pointerAt = performance.now();
      bus.wake();
    };
    const onLeave = () => { bus.pointer = null; bus.wake(); };
    const measure = () => {
      if (cta) {
        const r = cta.getBoundingClientRect();
        bus.cta = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      const canvasBox = stage.current?.querySelector<HTMLElement>('.hero-canvas-wrap') ?? stage.current;
      if (canvasBox) {
        const r = canvasBox.getBoundingClientRect();
        bus.stage = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
      if (hero) {
        const h = hero.offsetHeight || window.innerHeight;
        bus.scroll = Math.max(0, Math.min(1, window.scrollY / h));
      }
      bus.wake();
    };
    const enter = () => { measure(); bus.ctaHover = true; bus.ctaPulseAt = performance.now(); bus.wake(); };
    const leave = () => { bus.ctaHover = false; bus.wake(); };
    measure();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    cta?.addEventListener('pointerenter', enter);
    cta?.addEventListener('pointerleave', leave);
    cta?.addEventListener('focus', enter);
    cta?.addEventListener('blur', leave);
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0 });
    if (stage.current) io.observe(stage.current);
    const onVis = () => setActive(!document.hidden && bus.scroll < 1);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      cta?.removeEventListener('pointerenter', enter);
      cta?.removeEventListener('pointerleave', leave);
      cta?.removeEventListener('focus', enter);
      cta?.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [desktop3D, Scene]);

  useEffect(() => { if (active) bus.wake(); }, [active]);

  // Mobile: al tocar el CTA, la aguja SVG gira hacia el botón (350 ms) antes de navegar.
  useEffect(() => {
    if (desktop3D) return;
    const cta = document.querySelector<HTMLElement>('[data-hero-cta]');
    const svg = stage.current?.querySelector('svg');
    if (!cta || !svg || !isoNeedle.current) return;
    const aim = () => {
      const a = svg.getBoundingClientRect();
      const b = cta.getBoundingClientRect();
      const ang = screenAngle(a.left + a.width / 2, a.top + a.height / 2, b.left + b.width / 2, b.top + b.height / 2);
      isoNeedle.current?.style.setProperty('transform', `rotate(${ang}rad)`);
    };
    const back = () => isoNeedle.current?.style.removeProperty('transform');
    cta.addEventListener('pointerdown', aim);
    cta.addEventListener('focus', aim);
    cta.addEventListener('blur', back);
    return () => {
      cta.removeEventListener('pointerdown', aim);
      cta.removeEventListener('focus', aim);
      cta.removeEventListener('blur', back);
    };
  }, [desktop3D]);

  const live = !!stats?.live && stats.total > 0;
  const catCount = cat && live ? stats!.categories[cat] : 0;
  const showScene = desktop3D && Scene;
  const full = variant === 'b';
  const scene = showScene ? (
    <Scene compact={false} light={false} active={active} stats={stats} onReady={() => setReady(true)} tooltip={tooltip} />
  ) : null;
  const tip = variant === 'b' ? <div ref={tooltip} className="star-tip" data-show="false" /> : null;

  return (
    <>
      {heroEl && desktop3D && full && createPortal(
        <div className={`hero-fx${ready ? ' is-ready' : ''}`} aria-hidden="true">
          <div className="hero-sky">{scene}{tip}</div>
        </div>,
        heroEl,
      )}
      <div
        ref={stage}
        className={`hero-stage${ready ? ' is-ready' : ''}`}
        data-motion={mode}
        aria-hidden="true"
      >
        <div className="hero-static">
          <StaticCompass needleRef={isoNeedle} />
        </div>
        {!full && scene && <div className="hero-canvas-wrap">{scene}{tip}</div>}
        <p className={`cat-label${catCount ? ' on' : ''}`}>
          {catCount ? `${catCount} ${(cat ?? CATEGORIES[0]).toLowerCase()}` : ''}
        </p>
      </div>
    </>
  );
}
