"use client";

// "Qué es": las 4 tarjetas en los puntos cardinales de una rosa de los vientos.
// Desktop: la sección queda fija mientras scrolleás y la rosa gira 90° por
// tarjeta; la que queda al norte es la activa. Mobile: carrusel con la misma
// rotación en 2D. Reduced motion: rosa quieta y tarjetas en grilla.
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useIsCompact, useMotionMode, whenIdle } from '../web3d/capabilities';
import type { RoseState } from './RoseScene';

export interface RoseCard { n: string; title: string; text: string }

const CARDINAL = ['N', 'E', 'S', 'O'];

/** Rosa en SVG: la usan mobile, reduced motion y el fallback sin WebGL. */
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

function Card({ c, i, cardRef }: { c: RoseCard; i: number; cardRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div className="feat rose-card" ref={cardRef} data-i={i}>
      <div className="feat-icon">{c.n} · {CARDINAL[i]}</div>
      <h3 className="feat-title">{c.title}</h3>
      <p>{c.text}</p>
    </div>
  );
}

function ScrollRose({ cards, webgl }: { cards: RoseCard[]; webgl: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const state = useMemo<RoseState>(() => ({ rot: 0 }), []);
  const [Scene, setScene] = useState<ComponentType<{ state: RoseState; active: boolean }> | null>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [svgRot, setSvgRot] = useState(0);

  useEffect(() => {
    if (!webgl) return;
    // La escena se pide recién cuando la sección se acerca al viewport.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      whenIdle(() => import('./RoseScene').then((m) => setScene(() => m.default)), 1500);
    }, { rootMargin: '600px 0px' });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, [webgl]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    let raf = 0;
    let lastActive = -1;
    let lastDeg = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
      // Se detiene un rato en cada tarjeta (meseta) y gira entre una y otra.
      const raw = p * 3;
      const i = Math.min(2, Math.floor(raw));
      const frac = raw - i;
      const eased = raw >= 3 ? 3 : i + (frac < 0.25 ? 0 : frac > 0.75 ? 1 : (1 - Math.cos(((frac - 0.25) / 0.5) * Math.PI)) / 2);
      state.rot = eased * (Math.PI / 2);
      const st = stage.current;
      const w = st?.clientWidth ?? 1000;
      const h = st?.clientHeight ?? vh;
      const rx = Math.min(w * 0.36, 430);
      const ry = Math.min(h * 0.3, 250);
      cardEls.current.forEach((card, k) => {
        if (!card) return;
        const theta = k * (Math.PI / 2) - state.rot;
        const x = Math.sin(theta) * rx;
        const y = -Math.cos(theta) * ry;
        const front = Math.max(0, Math.cos(theta));
        const scale = 0.82 + 0.18 * front;
        card.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        card.style.opacity = (0.28 + 0.72 * Math.pow(front, 1.5)).toFixed(3);
        card.style.zIndex = String(Math.round(10 + front * 10));
        card.dataset.front = front > 0.92 ? 'true' : 'false';
      });
      const a = Math.round(eased) % 4;
      if (a !== lastActive) { lastActive = a; setActive(a); }
      const deg = eased * 90;
      if (Math.abs(deg - lastDeg) > 0.25) { lastDeg = deg; setSvgRot(deg); }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [state, webgl]);

  return (
    <div ref={wrap} className="rose-scroll">
      <div ref={stage} className="rose-sticky">
        <div className="rose-center">
          {Scene ? <Scene state={state} active={inView} /> : <RoseSvg rotation={svgRot} active={active} />}
        </div>
        {cards.map((c, i) => <Card key={c.title} c={c} i={i} cardRef={(el) => { cardEls.current[i] = el; }} />)}
        <ol className="rose-steps" aria-hidden="true">
          {cards.map((c, i) => <li key={c.title} className={i === active ? 'is-on' : ''}>{CARDINAL[i]} · {c.title}</li>)}
        </ol>
      </div>
    </div>
  );
}

function CarouselRose({ cards, animate }: { cards: RoseCard[]; animate: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { root, threshold: 0.6 });
    root.querySelectorAll('.rose-card').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);
  const go = (i: number) => {
    const el = track.current?.querySelectorAll<HTMLElement>('.rose-card')[i];
    el?.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
  };
  return (
    <div className="rose-carousel">
      <RoseSvg rotation={active * 90} active={active} className={animate ? '' : 'is-static'} />
      <div className="rose-track" ref={track}>
        {cards.map((c, i) => <Card key={c.title} c={c} i={i} />)}
      </div>
      <div className="rose-dots" role="group" aria-label="Elegí una tarjeta">
        {cards.map((c, i) => (
          <button key={c.title} type="button" aria-label={`${c.title} (${CARDINAL[i]})`} aria-current={i === active} onClick={() => go(i)}>
            {CARDINAL[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

function StaticRose({ cards }: { cards: RoseCard[] }) {
  return (
    <div className="rose-static">
      <RoseSvg className="is-static" />
      <div className="rose-static-grid">
        {cards.map((c, i) => <Card key={c.title} c={c} i={i} />)}
      </div>
    </div>
  );
}

export default function WindRose({ cards }: { cards: RoseCard[] }) {
  const mode = useMotionMode();
  const compact = useIsCompact('(max-width: 960px)');
  if (mode === 'pending' || mode === 'reduced') {
    // SSR y reduced motion: grilla estática (todo el texto en el HTML).
    return compact && mode === 'reduced' ? <CarouselRose cards={cards} animate={false} /> : <StaticRose cards={cards} />;
  }
  if (compact) return <CarouselRose cards={cards} animate />;
  return <ScrollRose cards={cards} webgl={mode === 'full'} />;
}
