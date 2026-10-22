"use client";

// Grilla que "se arma desde las partículas": al entrar en pantalla, cada
// tarjeta nace como un punto azul (las partículas del hero) y se expande a
// tarjeta, escalonado. Con reduced motion aparecen directo (lo resuelve el CSS).
import { useEffect, useRef, type ReactNode } from 'react';

export default function AssembleGrid({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('assemble-ready');
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      el.classList.add('in');
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`assemble ${className}`.trim()}>{children}</div>;
}
