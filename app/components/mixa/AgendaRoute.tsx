"use client";

// Agenda como ruta (MIX: versión A con las paradas reales): los encuentros que ya
// hicimos son waypoints grises, el último meetup (con fotos) es un waypoint
// destacado y el próximo meetup es una baliza
// azul que pulsa. Una flechita recorre la ruta hasta la baliza. Con fecha
// cargada (NEXT_PUBLIC_MEETUP_DATE) la baliza muestra la cuenta regresiva.
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../web3d/capabilities';

type Pt = [number, number];
interface Layout { w: number; h: number; pts: Pt[]; dx: number; vertical: boolean }

const WIDE: Layout = { w: 1000, h: 210, pts: [[50, 150], [255, 80], [460, 150], [690, 72], [940, 125]], dx: 95, vertical: false };
const TALL: Layout = { w: 320, h: 600, pts: [[70, 40], [230, 150], [80, 270], [220, 395], [150, 540]], dx: 70, vertical: true };

const STOPS = [
  { label: 'Coworks', kind: 'past', meta: 'Cafés y clubes' },
  { label: 'Meet & Talk 01', kind: 'past', meta: 'Primer meetup' },
  { label: 'Founders Edition', kind: 'past', meta: '18.09 · Tigre' },
  { label: 'Meet & Talk 02', kind: 'base', meta: '14.10 · Ver fotos' },
  { label: 'Próximo meetup', kind: 'next', meta: '' },
] as const;

function pathFor(l: Layout) {
  const [p0, ...rest] = l.pts;
  let d = `M${p0[0]} ${p0[1]}`;
  let prev = p0;
  for (const p of rest) {
    if (l.vertical) d += ` C${prev[0]} ${prev[1] + l.dx} ${p[0]} ${p[1] - l.dx} ${p[0]} ${p[1]}`;
    else d += ` C${prev[0] + l.dx} ${prev[1]} ${p[0] - l.dx} ${p[1]} ${p[0]} ${p[1]}`;
    prev = p;
  }
  return d;
}

function useCountdown(iso: string) {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    const t = Date.parse(iso);
    if (!iso || Number.isNaN(t)) return;
    const tick = () => {
      const ms = t - Date.now();
      if (ms <= 0) { setLeft(null); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft(`Faltan ${d} d ${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min`);
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

function Route({ l, nextProps, countdown, nextMeta }: { l: Layout; nextProps: React.AnchorHTMLAttributes<HTMLAnchorElement>; countdown: string | null; nextMeta: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const traveler = useRef<SVGGElement>(null);
  const [drawn, setDrawn] = useState(false);
  const d = pathFor(l);

  useEffect(() => {
    const el = wrap.current;
    const p = path.current;
    if (!el || !p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    const place = (s: number) => {
      const a = p.getPointAtLength(s * len);
      const b = p.getPointAtLength(Math.min(len, s * len + 1));
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
      traveler.current?.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${s >= 1 ? 0 : ang})`);
    };
    if (prefersReducedMotion()) { p.style.strokeDashoffset = '0'; place(1); setDrawn(true); return; }
    p.style.strokeDashoffset = `${len}`;
    place(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 2800;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const s = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        p.style.strokeDashoffset = `${len * (1 - s)}`;
        place(s);
        if (t < 1) raf = requestAnimationFrame(step); else setDrawn(true);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [d]);

  return (
    <div ref={wrap} className={`route ${l.vertical ? 'route--tall' : 'route--wide'}${drawn ? ' is-drawn' : ''}`} style={{ aspectRatio: `${l.w} / ${l.h}` }}>
      <svg viewBox={`0 0 ${l.w} ${l.h}`} aria-hidden="true" focusable="false">
        <path d={d} className="route-base" />
        <path ref={path} d={d} className="route-line" />
        <g ref={traveler} className="route-traveler">
          <path d="M0 -13 L-7 4 L0 -1 Z" className="tv-l" />
          <path d="M0 -13 L7 4 L0 -1 Z" className="tv-r" />
        </g>
      </svg>
      {STOPS.map((s, i) => {
        const [x, y] = l.pts[i];
        const style = { left: `${(x / l.w) * 100}%`, top: `${(y / l.h) * 100}%` };
        if (s.kind === 'next') {
          return (
            <a key={s.label} className="wp wp--next" style={style} {...nextProps}>
              <span className="wp-dot" aria-hidden="true"><span className="wp-pulse" /></span>
              <span className="wp-label"><strong>{s.label}</strong><em>{countdown ?? nextMeta}</em></span>
            </a>
          );
        }
        if (s.kind === 'base') {
          return (
            <a key={s.label} className="wp wp--base" style={style} href="#fotos">
              <span className="wp-dot" aria-hidden="true" />
              <span className="wp-label"><strong>{s.label}</strong><em>{s.meta}</em></span>
            </a>
          );
        }
        return (
          <div key={s.label} className="wp wp--past" style={style}>
            <span className="wp-dot" aria-hidden="true" />
            <span className="wp-label"><strong>{s.label}</strong><em>{s.meta}</em></span>
          </div>
        );
      })}
    </div>
  );
}

// nextMeta: texto de la baliza cuando no hay cuenta regresiva.
export default function AgendaRoute({ nextProps, meetupDate, nextMeta = 'Fecha y lugar en Luma' }: { nextProps: React.AnchorHTMLAttributes<HTMLAnchorElement>; meetupDate: string; nextMeta?: string }) {
  const countdown = useCountdown(meetupDate);
  return (
    <div className="route-wrap" role="group" aria-label="Ruta de encuentros: lo que ya hicimos y el próximo meetup">
      <Route l={WIDE} nextProps={nextProps} countdown={countdown} nextMeta={nextMeta} />
      <Route l={TALL} nextProps={nextProps} countdown={countdown} nextMeta={nextMeta} />
    </div>
  );
}
