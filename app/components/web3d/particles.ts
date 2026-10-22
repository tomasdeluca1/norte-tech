// Partículas de miembros: cada punto es un miembro real de la comunidad
// (o un grupo fijo de miembros cuando hay más que el tope del dispositivo),
// agrupados en sectores por categoría, como una torta hecha de personas.
import * as THREE from 'three';
import { CATEGORIES, CATEGORY_COLORS, type CommunityStats } from '@/lib/categories';

export const CATEGORY_COLORS_LIGHT = ['#1774FD', '#1360E6', '#0A3A94', '#0F58DE', '#4A4C57', '#82848F'];

export interface ParticleLayout {
  count: number;
  /** Miembros que representa cada partícula (1 = uno a uno). */
  perParticle: number;
  angle: Float32Array;
  radius: Float32Array;
  z: Float32Array;
  cat: Float32Array;
  seed: Float32Array;
  /** Cuántas partículas tiene cada categoría (mismo orden que CATEGORIES). */
  perCategory: number[];
  live: boolean;
}

function rand(seed: number) {
  // PRNG determinista (mulberry32), así el layout no salta entre renders.
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Reparte las partículas por categoría. Si los datos no están, cae a un
 * campo neutro (sin categorías) del tamaño `fallback`, sin inventar números.
 */
export function buildLayout(stats: CommunityStats | null, cap: number, fallback: number, rMin = 2.55, rMax = 3.7): ParticleLayout {
  const live = !!stats && stats.live && stats.total > 0;
  const total = live ? stats!.total : fallback;
  const perParticle = live ? Math.max(1, Math.ceil(total / cap)) : 1;
  const count = live ? Math.ceil(total / perParticle) : Math.min(fallback, cap);

  // Partículas por categoría con resto mayor, para que sumen `count`.
  let perCategory = CATEGORIES.map(() => 0);
  if (live) {
    const raw = CATEGORIES.map((c) => stats!.categories[c] / perParticle);
    perCategory = raw.map(Math.floor);
    let left = count - perCategory.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
    for (let k = 0; left > 0 && k < order.length; k++, left--) perCategory[order[k][1]] += 1;
  }

  const angle = new Float32Array(count);
  const radius = new Float32Array(count);
  const z = new Float32Array(count);
  const cat = new Float32Array(count);
  const seed = new Float32Array(count);
  const r = rand(20251022);
  const TAU = Math.PI * 2;

  if (live) {
    const gap = 0.07;
    const usable = TAU - gap * perCategory.filter((n) => n > 0).length;
    let start = 0;
    let i = 0;
    perCategory.forEach((n, ci) => {
      if (!n) return;
      const span = (usable * n) / count;
      for (let k = 0; k < n; k++, i++) {
        angle[i] = start + r() * span;
        radius[i] = rMin + Math.pow(r(), 0.8) * (rMax - rMin);
        z[i] = (r() - 0.5) * 0.9;
        cat[i] = ci;
        seed[i] = r();
      }
      start += span + gap;
    });
  } else {
    for (let i = 0; i < count; i++) {
      angle[i] = r() * TAU;
      radius[i] = rMin + Math.pow(r(), 0.8) * (rMax - rMin);
      z[i] = (r() - 0.5) * 0.9;
      cat[i] = -1;
      seed[i] = r();
    }
  }
  return { count, perParticle, angle, radius, z, cat, seed, perCategory, live };
}

export function categoryColorUniform(light: boolean): THREE.Vector3[] {
  const list = light ? CATEGORY_COLORS_LIGHT : CATEGORIES.map((c) => CATEGORY_COLORS[c]);
  return list.map((hex) => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  });
}

export const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uCat[6];
  uniform float uDim;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uInner;
  uniform vec3 uColors[6];
  uniform vec3 uNeutral;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aZ;
  attribute float aCat;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    int ci = int(aCat + 0.5);
    float h = aCat < -0.5 ? 0.0 : uCat[ci];
    float ang = aAngle + uTime * 0.025 * (0.6 + aSeed * 0.4) + sin(uTime * 0.5 + aSeed * 6.2831) * 0.012;
    float r = mix(aRadius, uInner + aSeed * 0.4, h * 0.9);
    vec3 p = vec3(sin(ang) * r, cos(ang) * r, aZ * (1.0 - h) + sin(uTime * 0.7 + aSeed * 12.0) * 0.05);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + aSeed * 40.0);
    gl_PointSize = uSize * (1.0 + h * 0.9) * (0.65 + aSeed * 0.7) * twinkle * uPixelRatio * (10.0 / -mv.z);
    vColor = aCat < -0.5 ? uNeutral : uColors[ci];
    vAlpha = mix(1.0 - uDim * 0.7, 1.0, h);
  }
`;

export const PARTICLE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.08, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function makeParticleGeometry(l: ParticleLayout): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  // three exige `position`; las posiciones reales las calcula el shader.
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(l.count * 3), 3));
  g.setAttribute('aAngle', new THREE.BufferAttribute(l.angle, 1));
  g.setAttribute('aRadius', new THREE.BufferAttribute(l.radius, 1));
  g.setAttribute('aZ', new THREE.BufferAttribute(l.z, 1));
  g.setAttribute('aCat', new THREE.BufferAttribute(l.cat, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(l.seed, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
  return g;
}

/** Lerp de las intensidades por categoría hacia la elegida (o ninguna). */
export function stepCategoryMix(mix: number[], active: number, dt: number): number {
  let max = 0;
  for (let i = 0; i < 6; i++) {
    const target = i === active ? 1 : 0;
    mix[i] += (target - mix[i]) * Math.min(1, dt * 6);
    max = Math.max(max, mix[i]);
  }
  return max;
}
