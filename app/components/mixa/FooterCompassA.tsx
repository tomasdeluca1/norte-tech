"use client";

// Footer: brújula chica que apunta siempre hacia arriba (volver al inicio).
// El dial gira con el scroll como una brújula de verdad que se mueve con vos;
// la aguja se queda clavada al norte, que es el inicio de la página.
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../web3d/capabilities';

export default function FooterCompass() {
  const dial = useRef<SVGGElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => dial.current?.setAttribute('transform', `rotate(${(window.scrollY * 0.06) % 360})`));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const toTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    (document.querySelector('.nav-logo') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  return (
    <a href="#top" className="f-compass" onClick={toTop} aria-label="Volver arriba, al inicio">
      <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
        <g ref={dial}>
          <circle r="44" className="fc-ring" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1="0" y1="-44" x2="0" y2={i % 3 === 0 ? -36 : -40} transform={`rotate(${i * 30})`} className="fc-tick" />
          ))}
        </g>
        <path d="M0 -34 L-14 6 L0 -6 Z" className="fc-l" />
        <path d="M0 -34 L14 6 L0 -6 Z" className="fc-r" />
      </svg>
      <span>Volver arriba</span>
    </a>
  );
}
