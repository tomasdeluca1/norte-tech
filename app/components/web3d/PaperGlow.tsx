"use client";

// Fondo del hero con @paper-design/shaders (mismo preset "norte-grain" del kit
// de brand-v2-paper): grano sutil y un glow azul que sigue a la aguja (A) o a
// la estrella polar (B). Opacidad baja: nunca compite con el texto.
import { useEffect, useRef } from 'react';
import {
  ShaderMount, grainGradientFragmentShader, GrainGradientShapes, ShaderFitOptions,
  getShaderColorFromString as col, getShaderNoiseTexture,
} from '@paper-design/shaders';
import { bus } from './bus';

export default function PaperGlow({ light, active }: { light: boolean; active: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const mountRef = useRef<ShaderMount | null>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let disposed = false;
    const noise = getShaderNoiseTexture();
    const start = () => {
      if (disposed || !node) return;
      const colors = light ? ['#A9CAFF', '#6EA6FF', '#1774FD'] : ['#0A3A94', '#0F58DE', '#1774FD'];
      mountRef.current = new ShaderMount(node, grainGradientFragmentShader, {
        u_fit: ShaderFitOptions.cover, u_scale: 0.9, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
        u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
        u_colorBack: col(light ? '#FFFFFF00' : '#00000000'),
        u_colors: colors.map(col), u_colorsCount: colors.length,
        u_softness: 1, u_intensity: 0.12, u_noise: 0.14,
        u_shape: GrainGradientShapes.sphere, u_noiseTexture: noise,
      }, { premultipliedAlpha: true, alpha: true }, 0.2, 0, 1, 1280 * 800);
    };
    if (noise.complete) start(); else noise.onload = start;

    let raf = 0;
    let lastX = 9;
    let lastY = 9;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const m = mountRef.current;
      const g = bus.glowPoint;
      if (!m || !g) return;
      const r = node.getBoundingClientRect();
      // offset del shader: fracción del tamaño, centro = 0; y hacia arriba.
      const x = Math.max(-0.6, Math.min(0.6, (g.x - (r.left + r.width / 2)) / r.width));
      const y = Math.max(-0.6, Math.min(0.6, -(g.y - (r.top + r.height / 2)) / r.height));
      const pulse = Math.exp(-(performance.now() - bus.ctaPulseAt) / 500);
      if (Math.abs(x - lastX) + Math.abs(y - lastY) > 0.002 || pulse > 0.01) {
        lastX += (x - lastX) * 0.12;
        lastY += (y - lastY) * 0.12;
        m.setUniforms({ u_offsetX: lastX, u_offsetY: lastY, u_intensity: 0.12 + pulse * 0.25 + (bus.ctaHover ? 0.08 : 0) });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      mountRef.current?.dispose();
      mountRef.current = null;
    };
  }, [light]);

  useEffect(() => { mountRef.current?.setSpeed(active ? 0.2 : 0); }, [active]);

  return <div ref={el} className="hero-paper" aria-hidden="true" />;
}
