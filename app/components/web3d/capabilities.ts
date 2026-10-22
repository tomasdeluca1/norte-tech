"use client";

import { useEffect, useState } from 'react';

export type MotionMode = 'pending' | 'full' | 'reduced' | 'nowebgl';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

let webglCache: boolean | null = null;
/** three.js r163+ y Paper necesitan WebGL2. Sin eso, va la imagen estática. */
export function hasWebGL2(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    // ?webgl=0 fuerza el fallback (para probarlo en el preview).
    if (new URLSearchParams(window.location.search).get('webgl') === '0') return (webglCache = false);
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    webglCache = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** Modo de movimiento de la página: decide 3D, estático por reduced-motion o fallback sin WebGL. */
export function useMotionMode(): MotionMode {
  const [mode, setMode] = useState<MotionMode>('pending');
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMode(mq.matches ? 'reduced' : hasWebGL2() ? 'full' : 'nowebgl');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mode;
}

export function useIsCompact(query = '(max-width: 960px), (hover: none), (pointer: coarse)'): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const u = () => setV(mq.matches);
    u();
    mq.addEventListener('change', u);
    return () => mq.removeEventListener('change', u);
  }, [query]);
  return v;
}

/** Espera a que la página cargó y el hilo principal está libre (no castiga el LCP). */
export function whenIdle(cb: () => void, timeout = 2500): () => void {
  let cancelled = false;
  let idleId: number | null = null;
  const run = () => {
    if (cancelled) return;
    const ric = (window as any).requestIdleCallback as undefined | ((f: () => void, o?: { timeout: number }) => number);
    if (ric) idleId = ric(() => !cancelled && cb(), { timeout });
    else idleId = window.setTimeout(() => !cancelled && cb(), 200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    if (idleId !== null) {
      const cic = (window as any).cancelIdleCallback as undefined | ((id: number) => void);
      if (cic) cic(idleId); else clearTimeout(idleId);
    }
  };
}

/** Variante del hero desde la URL (?hero=a|b). A es la default. */
export function heroVariantFromUrl(): 'a' | 'b' {
  if (typeof window === 'undefined') return 'a';
  return new URLSearchParams(window.location.search).get('hero')?.toLowerCase() === 'b' ? 'b' : 'a';
}
