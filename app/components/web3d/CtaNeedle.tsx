"use client";

// Banda CTA: la aguja del logo apunta al botón "Sumate al próximo meetup".
// Se orienta con un resorte (700 ms, --ease-spring) cuando la banda entra en
// pantalla y en cada resize (el botón cambia de lugar entre desktop y mobile).
import { useEffect, useRef } from 'react';
import { screenAngle } from './bus';

export default function CtaNeedle({ targetSelector }: { targetSelector: string }) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current;
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!el || !target) return;
    const aim = () => {
      const a = el.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      // Pivote en la base de la flecha (89 % del alto), como el logo.
      const ang = screenAngle(a.left + a.width / 2, a.top + a.height * 0.89, b.left + b.width / 2, b.top + b.height / 2);
      el.style.transform = `rotate(${ang}rad)`;
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) aim(); }, { threshold: 0.6 });
    io.observe(el);
    window.addEventListener('resize', aim);
    return () => { io.disconnect(); window.removeEventListener('resize', aim); };
  }, [targetSelector]);

  return (
    <svg ref={svg} className="cta-needle" viewBox="-130 -280 260 300" aria-hidden="true" focusable="false">
      <path fill="#1774FD" d="M0 -268L-125.5 11L0 -71Z" />
      <path fill="#0F58DE" d="M0 -268L125.5 11L0 -71Z" />
    </svg>
  );
}
