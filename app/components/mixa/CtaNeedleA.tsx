"use client";

// Banda CTA: una aguja grande que apunta al botón "Sumate al próximo meetup"
// siguiendo su posición (cambia con el layout: al costado en desktop, abajo en
// mobile). Cuando el botón está en hover/foco, la aguja late.
import { useEffect, useRef } from 'react';
import { angleDelta, screenAngle } from '../web3d/bus';
import { prefersReducedMotion } from '../web3d/capabilities';

export default function CtaNeedle({ targetSelector }: { targetSelector: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const needle = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = svg.current;
    const n = needle.current;
    if (!el || !n) return;
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!target) return;
    const reduced = prefersReducedMotion();
    let angle = 0;
    let vel = 0;
    let hot = false;
    let raf = 0;
    let running = false;
    const aim = () => {
      const a = el.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      return screenAngle(a.left + a.width / 2, a.top + a.height / 2, b.left + b.width / 2, b.top + b.height / 2);
    };
    const draw = () => n.setAttribute('transform', `rotate(${(angle * 180) / Math.PI})`);
    const onEnter = () => { hot = true; el.classList.add('is-hot'); };
    const onLeave = () => { hot = false; el.classList.remove('is-hot'); };
    target.addEventListener('pointerenter', onEnter);
    target.addEventListener('pointerleave', onLeave);
    target.addEventListener('focus', onEnter);
    target.addEventListener('blur', onLeave);

    if (reduced) {
      angle = aim();
      draw();
      const r = () => { angle = aim(); draw(); };
      window.addEventListener('resize', r);
      return () => {
        window.removeEventListener('resize', r);
        target.removeEventListener('pointerenter', onEnter);
        target.removeEventListener('pointerleave', onLeave);
        target.removeEventListener('focus', onEnter);
        target.removeEventListener('blur', onLeave);
      };
    }

    // Arranca desorientada (apuntando a otro lado) y se orienta al botón con inercia.
    angle = aim() + 2.4;
    draw();
    let last = performance.now();
    const t0 = last;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      const wobble = hot ? 0 : Math.sin(t * 1.3) * 0.05;
      const d = angleDelta(angle, aim() + wobble);
      const k = hot ? 120 : 22;
      const c = hot ? 18 : 4.5;
      vel += (k * d - c * vel) * dt;
      angle += vel * dt;
      draw();
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
      if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      target.removeEventListener('pointerenter', onEnter);
      target.removeEventListener('pointerleave', onLeave);
      target.removeEventListener('focus', onEnter);
      target.removeEventListener('blur', onLeave);
    };
  }, [targetSelector]);

  return (
    <svg ref={svg} className="cta-needle" viewBox="-130 -130 260 260" aria-hidden="true" focusable="false">
      <circle r="122" className="cn-ring" />
      <circle r="96" className="cn-ring cn-ring--dash" />
      {Array.from({ length: 36 }).map((_, i) => (
        <line key={i} x1="0" y1={-122} x2="0" y2={i % 9 === 0 ? -108 : -116} transform={`rotate(${i * 10})`} className="cn-tick" />
      ))}
      <g ref={needle}>
        <path d="M0 -110 L-46 6 L0 -26 Z" className="cn-l" />
        <path d="M0 -110 L46 6 L0 -26 Z" className="cn-r" />
      </g>
      <circle r="5" className="cn-hub" />
    </svg>
  );
}
