"use client";

// "Qué es": las 4 tarjetas en los puntos cardinales de una rosa de los vientos.
// El scroll es nativo: las tarjetas van en una columna normal y la rosa queda
// fija al costado (o arriba, en mobile) marcando en qué punto estás. Cada
// tarjeta ocupa el mismo tramo de scroll, así que avanzar es predecible.
// La barra N · E · S · O son botones reales: click o teclado te llevan a la
// tarjeta. Reduced motion: misma estructura, sin giro animado ni 3D.
import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { useIsCompact, useMotionMode, whenIdle } from '../web3d/capabilities';
import type { RoseState } from './RoseScene';

export interface RoseCard { n: string; title: string; text: string }

const CARDINAL = ['N', 'E', 'S', 'O'];

/** Rosa en SVG: la usan mobile, reduced motion, SSR y el fallback sin WebGL. */
export function RoseSvg({ rotation = 0, active = 0, className = '' }: { rotation?: number; active?: number; className?: string }) {
  const pts = [0, 1, 2, 3];
  return (
    <svg className={`rose-svg ${className}`.trim()} viewBox="-120 -120 240 240" aria-hidden="true" focusable="false">
      <circle r="112" className="rose-ring" />
      <circle r="70" className="rose-ring rose-ring--dash" />
      <path d="M0 -118 L-7 -104 L7 -104 Z" className="rose-lubber" />
      <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: '0 0' }} className="rose-spin">
        {pts.map((i) => (
          <g key={`s${i}`} transform={`rotate(${45 + i * 90})`}>
            <path d="M0 -62 L-13 -13 L0 0 Z" className="rose-short-l" />
            <path d="M0 -62 L13 -13 L0 0 Z" className="rose-short-r" />
          </g>
        ))}
        {pts.map((i) => (
          <g key={`l${i}`} transform={`rotate(${i * 90})`} className={i === active ? 'is-front' : ''}>
            <path d="M0 -100 L-18 -18 L0 0 Z" className="rose-long-l" />
            <path d="M0 -100 L18 -18 L0 0 Z" className="rose-long-r" />
          </g>
        ))}
        <circle r="4" className="rose-hub" />
      </g>
    </svg>
  );
}

export default function WindRose({ cards }: { cards: RoseCard[] }) {
  const mode = useMotionMode();
  const compact = useIsCompact('(max-width: 960px)');
  const webgl = mode === 'full' && !compact;
  const animate = mode === 'full' || mode === 'nowebgl';

  const root = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLElement | null)[]>([]);
  const navEls = useRef<(HTMLButtonElement | null)[]>([]);
  const state = useMemo<RoseState>(() => ({ rot: 0 }), []);
  const [Scene, setScene] = useState<ComponentType<{ state: RoseState; active: boolean }> | null>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);

  // La escena 3D se pide solo en desktop con WebGL, cuando la sección se acerca.
  useEffect(() => {
    if (!webgl || Scene) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      whenIdle(() => import('./RoseScene').then((m) => setScene(() => m.default)), 1500);
    }, { rootMargin: '600px 0px' });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, [webgl, Scene]);

  // Qué tarjeta está en el centro de la pantalla. Solo lee posiciones, nunca
  // mueve el scroll. `t` es continuo (0 a 3) para que la rosa 3D acompañe.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    let visible = false;
    let last = -1;
    const measure = () => {
      raf = 0;
      const anchor = window.innerHeight * 0.5;
      const centers = cardEls.current.map((c) => {
        if (!c) return 0;
        const r = c.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      let t = 0;
      if (anchor <= centers[0]) t = 0;
      else if (anchor >= centers[centers.length - 1]) t = centers.length - 1;
      else {
        for (let k = 0; k < centers.length - 1; k++) {
          if (anchor >= centers[k] && anchor < centers[k + 1]) {
            const f = (anchor - centers[k]) / Math.max(1, centers[k + 1] - centers[k]);
            // Meseta en cada tarjeta y giro entre una y otra.
            const e = f < 0.3 ? 0 : f > 0.7 ? 1 : (1 - Math.cos(((f - 0.3) / 0.4) * Math.PI)) / 2;
            t = k + e;
            break;
          }
        }
      }
      state.rot = t * (Math.PI / 2);
      const a = Math.round(t);
      if (a !== last) { last = a; setActive(a); }
    };
    const onScroll = () => { if (visible && !raf) raf = requestAnimationFrame(measure); };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      setInView(e.isIntersecting);
      if (visible) onScroll();
    });
    io.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [state]);

  const go = (i: number) => {
    const card = cardEls.current[i];
    if (!card) return;
    const smooth = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    card.focus({ preventScroll: true });
    setActive(i);
  };

  const onNavKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = cards.length;
    const map: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = -1;
    if (e.key in map) next = (i + map[e.key] + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    navEls.current[next]?.focus();
  };

  return (
    <div ref={root} className="rose" data-motion={animate ? 'on' : 'off'}>
      <div className="rose-aside">
        <div className="rose-visual">
          {Scene && webgl ? <Scene state={state} active={inView} /> : <RoseSvg rotation={active * 90} active={active} className={animate ? '' : 'is-static'} />}
        </div>
        <nav className="rose-nav" aria-label="Los cuatro puntos de Norte Tech">
          <ol>
            {cards.map((c, i) => (
              <li key={c.title}>
                <button
                  type="button"
                  ref={(b) => { navEls.current[i] = b; }}
                  aria-controls={`rose-card-${i}`}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => go(i)}
                  onKeyDown={(e) => onNavKey(e, i)}
                >
                  <span className="rose-nav-k" aria-hidden="true">{CARDINAL[i]}</span>
                  <span className="rose-nav-sep" aria-hidden="true"> · </span>
                  <span className="rose-nav-t">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <ol className="rose-list">
        {cards.map((c, i) => (
          <li key={c.title} className="rose-step">
            <article
              id={`rose-card-${i}`}
              ref={(el) => { cardEls.current[i] = el; }}
              tabIndex={-1}
              className="feat rose-card"
              data-active={i === active ? 'true' : 'false'}
              aria-labelledby={`rose-card-${i}-t`}
            >
              <p className="feat-icon">{c.n} · {CARDINAL[i]}</p>
              <h3 id={`rose-card-${i}-t`} className="feat-title">{c.title}</h3>
              <p>{c.text}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
