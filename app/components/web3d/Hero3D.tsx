"use client";

// Capa visual del hero. El texto del hero es HTML normal y se pinta primero
// (LCP); esto monta la imagen estática de la marca y, cuando la página ya
// cargó y el hilo está libre, reemplaza esa imagen por la escena 3D.
// - prefers-reduced-motion: queda el logo estático, sin parallax.
// - Sin WebGL2: queda la misma imagen estática (fallback).
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import CompassMotif from '../CompassMotif';
import type { CommunityStats } from '@/lib/categories';
import { bus } from './bus';
import { heroVariantFromUrl, useIsCompact, useMotionMode, whenIdle } from './capabilities';
import type { SceneProps } from './CompassScene';

const COMPACT_QUERY = '(max-width: 960px), (hover: none), (pointer: coarse)';

type AnyScene = ComponentType<SceneProps & { tooltip?: React.RefObject<HTMLDivElement> }>;

/**
 * Isologo de brand-v1 en SVG inline: es la imagen estática del hero (fallback
 * sin WebGL y reduced motion). Inline para no pedir otro archivo antes del LCP.
 */
function StaticIsologo() {
  return (
    <svg className="hero-isologo hero-iso-inline" viewBox="0 0 518 506" aria-hidden="true" focusable="false">
      <g transform="translate(259 272)">
        <path className="iso-ring" d="M-56.31 -186.69A195 195 0 0 0 -32 192.36L-32 172.05A175 175 0 0 1 -67.7 -161.37ZM56.31 -186.69A195 195 0 0 1 32 192.36L32 172.05A175 175 0 0 0 67.7 -161.37Z" />
        <path className="iso-ring" d="M-255 0L-179 -15L-179 15ZM255 0L179 -15L179 15ZM0 131L14 176L0 230L-14 176Z" />
        <path fill="#1774FD" d="M0 -268L-125.5 11L0 -71Z" />
        <path fill="#0F58DE" d="M0 -268L125.5 11L0 -71Z" />
      </g>
    </svg>
  );
}

function useLightTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setLight(html.getAttribute('data-theme') === 'light');
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return light;
}

export default function Hero3D({ stats }: { stats: CommunityStats | null }) {
  const mode = useMotionMode();
  const compact = useIsCompact(COMPACT_QUERY);
  const light = useLightTheme();
  const [variant, setVariant] = useState<'a' | 'b'>('a');
  const [Scene, setScene] = useState<AnyScene | null>(null);
  const [Glow, setGlow] = useState<ComponentType<{ light: boolean; active: boolean }> | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const [heroEl, setHeroEl] = useState<HTMLElement | null>(null);
  useEffect(() => { setHeroEl(stage.current?.closest('.hero') as HTMLElement | null); }, []);

  useEffect(() => { setVariant(heroVariantFromUrl()); }, []);
  useEffect(() => { bus.stats = stats; }, [stats]);

  // Carga diferida de la escena (y del shader de fondo, sólo en desktop).
  useEffect(() => {
    if (mode !== 'full') return;
    setReady(false);
    // Se lee directo (no del estado) para no cargar como desktop en el primer render.
    const small = window.matchMedia(COMPACT_QUERY).matches;
    let cancel = () => {};
    const load = () => {
      cancel = whenIdle(() => {
        const scene = variant === 'b' ? import('./ConstellationScene') : import('./CompassScene');
        scene.then((m) => setScene(() => m.default as AnyScene)).catch(() => {});
        if (!small) import('./PaperGlow').then((m) => setGlow(() => m.default)).catch(() => {});
      }, 2000);
    };
    // En mobile la brújula queda debajo del texto: se carga cuando la mitad
    // entra en pantalla o con el primer gesto (scroll/toque). Ahorra batería y
    // datos a quien sólo lee el hero.
    if (!small || !stage.current) { load(); return () => cancel(); }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      io.disconnect();
      window.removeEventListener('scroll', go);
      window.removeEventListener('touchstart', go);
      load();
    };
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio >= 0.6) go(); }, { threshold: [0, 0.6] });
    io.observe(stage.current);
    window.addEventListener('scroll', go, { passive: true, once: true });
    window.addEventListener('touchstart', go, { passive: true, once: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', go);
      window.removeEventListener('touchstart', go);
      cancel();
    };
  }, [mode, variant]);

  // Puntero, CTA, scroll y visibilidad -> bus (sin renders de React).
  useEffect(() => {
    if (mode !== 'full') return;
    const hero = stage.current?.closest('.hero') as HTMLElement | null;
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') bus.pointer = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { bus.pointer = null; };
    const measure = () => {
      const cta = document.querySelector<HTMLElement>('[data-hero-cta]');
      if (cta) {
        const r = cta.getBoundingClientRect();
        bus.cta = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      if (hero) {
        const h = hero.offsetHeight || window.innerHeight;
        bus.scroll = Math.max(0, Math.min(1, window.scrollY / h));
      }
    };
    measure();
    // Sólo el mouse mueve la aguja (en touch apunta al CTA); se decide por evento, así anda en equipos híbridos.
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0 });
    if (stage.current) io.observe(stage.current);
    const onVis = () => setActive(!document.hidden && (bus.scroll < 1));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [mode]);

  const showScene = mode === 'full' && Scene;
  // B en desktop ocupa todo el hero (cielo detrás del texto); el resto vive en la columna derecha.
  const full = variant === 'b' && !compact;
  const scene = showScene ? (
    <Scene compact={compact} light={light} active={active} stats={stats} onReady={() => setReady(true)} tooltip={tooltip} />
  ) : null;
  const tip = variant === 'b' ? <div ref={tooltip} className="star-tip" data-show="false" /> : null;

  return (
    <>
      {heroEl && mode === 'full' && createPortal(
        <div className={`hero-fx${ready ? ' is-ready' : ''}`} aria-hidden="true">
          {Glow && <Glow light={light} active={active} />}
          {full && <div className="hero-sky">{scene}{tip}</div>}
        </div>,
        heroEl,
      )}
      <div
        ref={stage}
        className={`hero-stage hero-stage--${variant}${full ? ' hero-stage--full' : ''}${ready ? ' is-ready' : ''}`}
        data-motion={mode}
        aria-hidden="true"
      >
        <div className="hero-emblem hero-static">
          <CompassMotif />
          <StaticIsologo />
        </div>
        {!full && scene && <div className="hero-canvas-wrap">{scene}{tip}</div>}
      </div>
    </>
  );
}
