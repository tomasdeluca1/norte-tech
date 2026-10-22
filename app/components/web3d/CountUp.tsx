"use client";

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './capabilities';

/**
 * Número real con el valor final ya en el HTML (SSR). Sólo anima desde 0 si el
 * elemento entra en pantalla después de la carga (si ya se ve, no se mueve).
 * El valor accesible va en el texto sr-only del padre; esto es aria-hidden.
 */
export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // ya visible: queda el número final
    let raf = 0;
    setShown(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); setShown(value); };
  }, [value, duration]);
  return <span ref={ref} aria-hidden="true">{shown}</span>;
}
