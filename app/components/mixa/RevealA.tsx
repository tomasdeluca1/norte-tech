"use client";

// Reveal de la versión A para las secciones .mixA (mismos selectores que 4b96efd).
// Mejora progresiva: sin JS todo se ve; con reduced motion se muestra todo de una.
import { useEffect } from 'react';

const TARGETS = '.mixA [data-reveal], .mixA .about-grid > div, .mixA .terminal, .mixA .feat:not(.rose-card), .mixA .events-hd, .mixA .ev-card:not(.ev-dim), .mixA .comunidad-head, .mixA .cta-inner';

export default function RevealA() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(TARGETS));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.classList.add('in')); return; }
    const vh = window.innerHeight;
    els.forEach((e) => { if (e.getBoundingClientRect().top < vh) e.classList.add('in'); });
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((t, i) => { t.style.setProperty('--reveal-i', String(i % 6)); io.observe(t); });
    return () => io.disconnect();
  }, []);
  return null;
}
