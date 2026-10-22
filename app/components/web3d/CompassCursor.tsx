"use client";

// Cursor de la marca (la flecha del brand-v1). Sigue al mouse y la puntita
// gira suave hacia el CTA del meetup más cercano. Sólo con mouse: en touch,
// con reduced motion o en campos de texto queda el cursor del sistema.
import { useEffect, useRef } from 'react';
import { angleDelta, screenAngle } from './bus';

const REST = -0.42; // inclinación de reposo, como un puntero clásico

export default function CompassCursor() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!node || reduced) return;
    const html = document.documentElement;

    let x = -100;
    let y = -100;
    let angle = REST;
    let visible = false;
    let raf = 0;
    let ctas: HTMLElement[] = [];
    let measuredAt = 0;

    const nearestCta = () => {
      const now = performance.now();
      if (now - measuredAt > 1000) { ctas = Array.from(document.querySelectorAll<HTMLElement>('[data-cta]')); measuredAt = now; }
      let best: { x: number; y: number; d: number } | null = null;
      for (const c of ctas) {
        const r = c.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || !r.width) continue;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(cx - x, cy - y);
        if (!best || d < best.d) best = { x: cx, y: cy, d };
      }
      return best;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const c = nearestCta();
      // Cerca de un CTA (< 520 px) la punta lo busca; más lejos vuelve al reposo.
      let target = REST;
      if (c && c.d > 8) {
        const w = Math.max(0, 1 - c.d / 520);
        target = REST + angleDelta(REST, screenAngle(x, y, c.x, c.y)) * Math.min(1, w * 1.6);
      }
      angle += angleDelta(angle, target) * 0.14;
      node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        // Touch o lápiz: volvemos al cursor del sistema.
        html.classList.remove('has-nt-cursor');
        visible = false; node.dataset.show = 'false';
        return;
      }
      html.classList.add('has-nt-cursor');
      x = e.clientX;
      y = e.clientY;
      if (!visible) { visible = true; node.dataset.show = 'true'; }
      const t = e.target as HTMLElement | null;
      const text = !!t?.closest('input, textarea, select, [contenteditable="true"]');
      node.dataset.text = text ? 'true' : 'false';
      node.dataset.hot = t?.closest('a, button, [role="button"], label') ? 'true' : 'false';
    };
    const onLeave = () => { visible = false; node.dataset.show = 'false'; };
    window.addEventListener('pointermove', onMove, { passive: true });
    html.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      html.removeEventListener('pointerleave', onLeave);
      html.classList.remove('has-nt-cursor');
    };
  }, []);

  return (
    <div ref={el} className="nt-cursor" data-show="false" aria-hidden="true">
      <svg viewBox="-130 -10 260 290" width="22" height="24">
        <path d="M0 0L-125.5 279L0 197Z" fill="#1774FD" />
        <path d="M0 0L125.5 279L0 197Z" fill="#0F58DE" />
      </svg>
    </div>
  );
}
