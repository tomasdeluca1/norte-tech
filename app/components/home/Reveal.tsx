"use client";

// Reveal al hacer scroll (§4.4): opacity 0 -> 1 y 12 px -> 0 en 480 ms, una
// sola vez, stagger 60 ms. Mejora progresiva: sin JS todo se ve. Nada en el hero, y
// nada de lo que ya se ve al cargar se esconde (N1-3).
import { useEffect } from 'react';

export function showAllSections() {
  document.documentElement.classList.add('cv-off');
}

export default function Reveal() {
  // content-visibility: auto (home.css) estima 1000 px por sección hasta renderizarla;
  // antes de saltar a un ancla se apaga para que el destino caiga en su lugar.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (a) showAllSections();
    };
    document.addEventListener('click', onClick, true);
    if (location.hash) showAllSections();
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const vh = window.innerHeight;
    const pending = els.filter((el) => el.getBoundingClientRect().top > vh);
    if (!pending.length) return;
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.style.transitionDelay = `${Math.min(n++, 5) * 60}ms`;
        el.classList.add('in');
        // El stagger es sólo para la entrada: después no frena los hovers (N2-2).
        el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
        io.unobserve(el);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    pending.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
    return () => io.disconnect();
  }, []);
  return null;
}
