"use client";

// Cursor de la marca (la flecha del brand-v1), SÓLO dentro del hero (decisión
// D3, ver COMPASS_CURSOR en lib/site.ts). Fuera del hero queda el cursor del
// sistema. La puntita gira suave hacia el CTA del hero. Sólo con mouse: en
// touch, con reduced motion o en campos de texto queda el cursor del sistema.
// El rAF corre sólo mientras el mouse está dentro del hero.
import { useEffect, useRef } from 'react';
import { COMPASS_CURSOR } from '@/lib/site';
import { angleDelta, screenAngle } from './bus';

const REST = -0.42; // inclinación de reposo, como un puntero clásico

export default function CompassCursor() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || COMPASS_CURSOR === 'off') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = document.querySelector<HTMLElement>('.hero');
    const cta = document.querySelector<HTMLElement>('[data-hero-cta]');
    if (!hero) return;

    let x = -100;
    let y = -100;
    let angle = REST;
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      let target = REST;
      if (cta) {
        const r = cta.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(cx - x, cy - y);
        // Cerca del CTA (< 520 px) la punta lo busca; más lejos vuelve al reposo.
        if (d > 8) {
          const w = Math.max(0, 1 - d / 520);
          target = REST + angleDelta(REST, screenAngle(x, y, cx, cy)) * Math.min(1, w * 1.6);
        }
      }
      angle += angleDelta(angle, target) * 0.14;
      node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      node.dataset.show = 'false';
      hero.classList.remove('has-nt-cursor');
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') { stop(); return; }
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      node.dataset.text = t?.closest('input, textarea, select, [contenteditable="true"]') ? 'true' : 'false';
      node.dataset.hot = t?.closest('a, button, [role="button"], label') ? 'true' : 'false';
      if (!raf) {
        hero.classList.add('has-nt-cursor');
        node.dataset.show = 'true';
        raf = requestAnimationFrame(tick);
      }
    };
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', stop);
    return () => {
      stop();
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', stop);
    };
  }, []);

  if (COMPASS_CURSOR === 'off') return null;
  return (
    <div ref={el} className="nt-cursor" data-show="false" aria-hidden="true">
      <svg viewBox="-130 -10 260 290" width="22" height="24">
        <path d="M0 0L-125.5 279L0 197Z" fill="#1774FD" />
        <path d="M0 0L125.5 279L0 197Z" fill="#0F58DE" />
      </svg>
    </div>
  );
}
