"use client";

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './capabilities';

/** Cuenta desde 0 hasta el número real cuando entra en pantalla. */
export default function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return; }
    let raf = 0;
    const el = ref.current;
    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (!el) { run(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  // El número real queda accesible aunque la animación esté a mitad.
  return (
    <span ref={ref} aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
