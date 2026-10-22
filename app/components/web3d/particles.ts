// Partículas de miembros: cada punto es un miembro real de la comunidad
// (o un grupo fijo de miembros cuando hay más que el tope del dispositivo),
// en 6 sectores ordenados por categoría (orden de CATEGORIES) y 3 órbitas
// fijas. Sin datos reales no se dibuja nada (no inventamos números).
import { BufferAttribute, BufferGeometry, Color, Sphere, Vector3 } from 'three';
import { CATEGORIES, CATEGORY_COLORS, type CommunityStats } from '@/lib/categories';

export const CATEGORY_COLORS_LIGHT = ['#1774FD', '#1360E6', '#0A3A94', '#0F58DE', '#4A4C57', '#82848F'];

/** Radios de las 3 órbitas (unidades del mundo) y separación entre sectores (rad). */
export const ORBITS = [2.72, 2.86, 3.0];
export const SECTOR_GAP = 0.06;

export interface ParticleLayout {
  count: number;
  /** Miembros que representa cada partícula (1 = uno a uno). */
  perParticle: number;
  angle: Float32Array;
  radius: Float32Array;
  cat: Float32Array;
  /** Cuántas partículas tiene cada categoría (mismo orden que CATEGORIES). */
  perCategory: number[];
  live: boolean;
}

export function buildLayout(stats: CommunityStats | null, cap: number): ParticleLayout {
  const live = !!stats && stats.live && stats.total > 0;
  if (!live) {
    return { count: 0, perParticle: 1, angle: new Float32Array(0), radius: new Float32Array(0), cat: new Float32Array(0), perCategory: CATEGORIES.map(() => 0), live: false };
  }
  const total = stats!.total;
  const perParticle = Math.max(1, Math.ceil(total / cap));
  const count = Math.ceil(total / perParticle);

  // Partículas por categoría con resto mayor, para que sumen `count`.
  const raw = CATEGORIES.map((c) => stats!.categories[c] / perParticle);
  const perCategory = raw.map(Math.floor);
  let left = count - perCategory.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) perCategory[order[k][1]] += 1;

  const angle = new Float32Array(count);
  const radius = new Float32Array(count);
  const cat = new Float32Array(count);
  const TAU = Math.PI * 2;
  const sectors = perCategory.filter((n) => n > 0).length;
  const usable = TAU - SECTOR_GAP * sectors;
  // 0 = norte, sentido horario. Los sectores arrancan en el SUR (N1-6): Founders y
  // Builders, los grandes, cubren el norte parejo y las categorías chicas caen abajo,
  // junto a la marca S, en vez de quedar como un racimo sobre la punta de la aguja.
  let start = Math.PI + SECTOR_GAP / 2;
  let i = 0;
  perCategory.forEach((n, ci) => {
    if (!n) return;
    const span = (usable * n) / count;
    for (let k = 0; k < n; k++, i++) {
      angle[i] = start + ((k + 0.5) / n) * span;
      radius[i] = ORBITS[k % ORBITS.length];
      cat[i] = ci;
    }
    start += span + SECTOR_GAP;
  });
  return { count, perParticle, angle, radius, cat, perCategory, live };
}

/** Color de reposo de las partículas (#1774FD), en el mismo espacio que categoryColorUniform. */
export function restColorUniform(): Vector3 {
  const c = new Color('#1774FD');
  return new Vector3(c.r, c.g, c.b);
}

export function categoryColorUniform(light: boolean): Vector3[] {
  const list = light ? CATEGORY_COLORS_LIGHT : CATEGORIES.map((c) => CATEGORY_COLORS[c]);
  return list.map((hex) => {
    const c = new Color(hex);
    return new Vector3(c.r, c.g, c.b);
  });
}

// Órbita lenta: una vuelta cada 240 s (0,026 rad/s). Sin titileo.
// En reposo todas las partículas van en azul de marca (uRest) a opacidad 0,85 (N1-6);
// el color propio de la categoría aparece sólo al resaltarla (hover/foco del chip):
// opacidad 1 y tamaño x1,45; el resto baja a 0,25.
export const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uCat[6];
  uniform float uDim;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uColors[6];
  uniform vec3 uRest;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aCat;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    int ci = int(aCat + 0.5);
    float h = uCat[ci];
    float ang = aAngle + uTime * 0.026;
    vec3 p = vec3(sin(ang) * aRadius, cos(ang) * aRadius, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + h * 0.45) * uPixelRatio * (10.0 / -mv.z);
    vColor = mix(uRest, uColors[ci], h);
    vAlpha = mix((1.0 - uDim * 0.75) * 0.85, 1.0, h);
  }
`;

export const PARTICLE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.36, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function makeParticleGeometry(l: ParticleLayout): BufferGeometry {
  const g = new BufferGeometry();
  // three exige `position`; las posiciones reales las calcula el shader.
  g.setAttribute('position', new BufferAttribute(new Float32Array(l.count * 3), 3));
  g.setAttribute('aAngle', new BufferAttribute(l.angle, 1));
  g.setAttribute('aRadius', new BufferAttribute(l.radius, 1));
  g.setAttribute('aCat', new BufferAttribute(l.cat, 1));
  g.boundingSphere = new Sphere(new Vector3(), 6);
  return g;
}

/**
 * Lleva las intensidades por categoría hacia la elegida (o ninguna) en ~260 ms
 * con salida suave. Devuelve el máximo (para atenuar al resto) y si sigue en movimiento.
 */
export function stepCategoryMix(mix: number[], active: number, dt: number): { max: number; moving: boolean } {
  let max = 0;
  let moving = false;
  for (let i = 0; i < 6; i++) {
    const target = i === active ? 1 : 0;
    mix[i] += (target - mix[i]) * Math.min(1, dt * 12);
    if (Math.abs(target - mix[i]) < 0.002) mix[i] = target; else moving = true;
    max = Math.max(max, mix[i]);
  }
  return { max, moving };
}
