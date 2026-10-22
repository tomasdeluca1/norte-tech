"use client";
// Analytics fuera de la ventana del LCP (crítica v2 §3.3 paso 2): Umami (y GA4 si
// GA4_MODE = 'deferred') se inyectan con la primera interacción (pointerdown,
// keydown, scroll, touchstart) o a los 5 s del load, lo que pase primero.
import { useEffect } from 'react';
import { GA4_ID, GA4_MODE, UMAMI_WEBSITE_ID } from '@/lib/site';

type W = Window & { __ntAnalytics?: boolean; dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

function inject() {
  const w = window as W;
  if (w.__ntAnalytics) return;
  w.__ntAnalytics = true;
  const u = document.createElement('script');
  u.src = 'https://cloud.umami.is/script.js';
  u.defer = true;
  u.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  document.head.appendChild(u);
  if (GA4_MODE === 'deferred') {
    w.dataLayer = w.dataLayer || [];
    // gtag espera el objeto `arguments`, no un array.
    w.gtag = function gtag() { (w.dataLayer as unknown[]).push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', GA4_ID);
    const g = document.createElement('script');
    g.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    g.async = true;
    document.head.appendChild(g);
  }
}

const EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

export default function DeferredAnalytics() {
  useEffect(() => {
    let t = 0;
    const go = () => { EVENTS.forEach((e) => removeEventListener(e, go)); clearTimeout(t); inject(); };
    EVENTS.forEach((e) => addEventListener(e, go, { once: true, passive: true }));
    const arm = () => { t = window.setTimeout(go, 5000); };
    if (document.readyState === 'complete') arm(); else addEventListener('load', arm, { once: true });
    return () => { EVENTS.forEach((e) => removeEventListener(e, go)); removeEventListener('load', arm); clearTimeout(t); };
  }, []);
  return null;
}
