"use client";

// Footer: brújula chica con la aguja al norte (volver al inicio). El dial queda
// fijo, como en el hero (N2-3): sin movimiento con el scroll.
import { prefersReducedMotion } from './capabilities';

export default function FooterCompass() {
  const toTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    (document.querySelector('.nav-logo') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  return (
    <a href="#top" className="f-compass" onClick={toTop}>
      <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
        <circle r="44" className="fc-ring" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="0" y1="-44" x2="0" y2={i % 3 === 0 ? -36 : -40} transform={`rotate(${i * 30})`} className="fc-tick" />
        ))}
        <path d="M0 -34 L-14 6 L0 -6 Z" className="fc-l" />
        <path d="M0 -34 L14 6 L0 -6 Z" className="fc-r" />
      </svg>
      <span>Volver arriba</span>
    </a>
  );
}
