"use client";

// Reveal al hacer scroll (§4.4): opacity 0 -> 1 y 12 px -> 0 en 480 ms, una
// sola vez, stagger 60 ms. Mejora progresiva: sin JS todo se ve. Nada en el hero.
import { useEffect } from 'react';

export default function Reveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const vh = window.innerHeight;
    const pending = els.filter((el) => el.getBoundingClientRect().top > vh * 0.92);
    if (!pending.length) return;
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.style.transitionDelay = `${Math.min(n++, 5) * 60}ms`;
        el.classList.add('in');
        io.unobserve(el);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    pending.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
    return () => io.disconnect();
  }, []);
  return null;
}
