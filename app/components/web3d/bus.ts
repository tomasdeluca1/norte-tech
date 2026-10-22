// Canal compartido entre el DOM (puntero, hover del CTA y de los chips) y las
// escenas 3D. Es un objeto mutable a propósito: las escenas lo leen en cada
// frame sin provocar renders de React.
import type { Category, CommunityStats } from '@/lib/categories';

export interface HeroBus {
  /** Puntero en coordenadas de viewport (px). null = sin puntero (touch). */
  pointer: { x: number; y: number } | null;
  /** Centro del CTA principal del hero en viewport (px). */
  cta: { x: number; y: number } | null;
  ctaHover: boolean;
  /** Momento (performance.now) del último pulso, para la luz azul. */
  ctaPulseAt: number;
  category: Category | null;
  /** Progreso de scroll del hero, 0 arriba, 1 cuando el hero salió. */
  scroll: number;
  /** Ángulo actual de la aguja en radianes (0 = norte, sentido horario). */
  needle: number;
  /** Punto (viewport px) que sigue el glow del shader de fondo: punta de la aguja o estrella polar. */
  glowPoint: { x: number; y: number } | null;
  stats: CommunityStats | null;
}

export const bus: HeroBus = {
  pointer: null,
  cta: null,
  ctaHover: false,
  ctaPulseAt: -1e9,
  category: null,
  scroll: 0,
  needle: 0,
  glowPoint: null,
  stats: null,
};

/** Ángulo (0 = arriba, horario) desde el punto a hasta b, en pantalla. */
export function screenAngle(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(bx - ax, -(by - ay));
}

/** Diferencia angular más corta (b - a) en [-PI, PI]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
