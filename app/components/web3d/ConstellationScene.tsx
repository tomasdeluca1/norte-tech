"use client";

// Hero B · "Constelación del norte". Cada estrella es un miembro real,
// agrupado en una constelación por categoría. Las líneas se dibujan solas y
// forman la flecha del logo; la punta es la estrella polar, que late cuando el
// cursor (o el foco) está sobre el CTA del meetup.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CATEGORIES, type CommunityStats } from '@/lib/categories';
import { bus } from './bus';
import { categoryColorUniform, stepCategoryMix } from './particles';
import type { SceneProps } from './CompassScene';

type Props = SceneProps & { tooltip: React.RefObject<HTMLDivElement> };

function rand(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
}

// Flecha del logo (coordenadas del SVG del isologo, y hacia abajo).
const ARROW = { tip: [0, -268], left: [-125.5, 11], notch: [0, -71], right: [125.5, 11] } as const;

interface Sky {
  positions: Float32Array;
  cat: Float32Array;
  seed: Float32Array;
  count: number;
  perParticle: number;
  perCategory: number[];
  live: boolean;
}

function buildSky(stats: CommunityStats | null, cap: number, spread: [number, number]): Sky {
  const live = !!stats && stats.live && stats.total > 0;
  const total = live ? stats!.total : 140;
  const perParticle = live ? Math.max(1, Math.ceil(total / cap)) : 1;
  const count = live ? Math.ceil(total / perParticle) : Math.min(total, cap);
  const perCategory = CATEGORIES.map((c) => (live ? Math.round(stats!.categories[c] / perParticle) : 0));
  // Ajuste para que la suma dé `count`.
  if (live) {
    let diff = count - perCategory.reduce((a, b) => a + b, 0);
    for (let i = 0; diff !== 0; i = (i + 1) % 6) {
      if (diff > 0) { perCategory[i]++; diff--; } else if (perCategory[i] > 0) { perCategory[i]--; diff++; }
    }
  }
  const r = rand(7031);
  const positions = new Float32Array(count * 3);
  const cat = new Float32Array(count);
  const seed = new Float32Array(count);
  const [sx, sy] = spread;
  let i = 0;
  const put = (x: number, y: number, z: number, c: number) => {
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    cat[i] = c; seed[i] = r(); i++;
  };
  if (live) {
    // Seis constelaciones alrededor del cielo, una por categoría.
    perCategory.forEach((n, ci) => {
      const a = (ci / 6) * Math.PI * 2 + 0.5;
      const cx = Math.cos(a) * sx * 0.62;
      const cy = Math.sin(a) * sy * 0.62;
      for (let k = 0; k < n; k++) put(cx + gauss(r) * sx * 0.16, cy + gauss(r) * sy * 0.18, (r() - 0.6) * 3, ci);
    });
  } else {
    for (let k = 0; k < count; k++) put((r() - 0.5) * 2 * sx, (r() - 0.5) * 2 * sy, (r() - 0.6) * 3, -1);
  }
  return { positions, cat, seed, count: i, perParticle, perCategory, live };
}

const STAR_VERT = /* glsl */ `
  uniform float uTime; uniform float uCat[6]; uniform float uDim; uniform float uPixelRatio; uniform float uHover;
  uniform vec3 uColors[6]; uniform vec3 uNeutral;
  attribute float aCat; attribute float aSeed; attribute float aIndex;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    int ci = int(aCat + 0.5);
    float h = aCat < -0.5 ? 0.0 : uCat[ci];
    float hov = abs(aIndex - uHover) < 0.5 ? 1.0 : 0.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.7 + 0.3 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 50.0);
    gl_PointSize = (5.0 + aSeed * 5.0) * (1.0 + h * 0.8 + hov * 1.6) * tw * uPixelRatio * (10.0 / -mv.z);
    vColor = aCat < -0.5 ? uNeutral : uColors[ci];
    vAlpha = clamp(mix(0.85 - uDim * 0.6, 1.0, max(h, hov)), 0.0, 1.0);
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(mix(vColor, vec3(1.0), core * core * 0.35), (core * 0.55 + core * core * 0.45) * vAlpha);
  }
`;
const FLARE_FRAG = /* glsl */ `
  uniform float uPulse; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p);
    float glow = exp(-d * d * 60.0) + 0.35 * exp(-d * d * 8.0) * uPulse;
    float rays = exp(-abs(p.x) * 90.0) * exp(-abs(p.y) * 5.0) + exp(-abs(p.y) * 90.0) * exp(-abs(p.x) * 5.0);
    float a = clamp(glow + rays * (0.55 + uPulse * 0.6), 0.0, 1.0);
    gl_FragColor = vec4(mix(uColor, vec3(1.0), glow * 0.6), a);
  }
`;
const FLARE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

function Constellation({ compact, light, stats, tooltip }: Omit<Props, 'active' | 'onReady'>) {
  const { gl, camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const halfH = Math.tan((38 / 2) * (Math.PI / 180)) * 10;
  const halfW = halfH * aspect;
  // En desktop la flecha va en la mitad derecha (al lado del texto); en mobile, centrada.
  const arrowX = compact ? 0 : halfW * 0.48;
  const arrowScale = compact ? 0.0095 : 0.0105;

  const sky = useMemo(() => buildSky(stats, compact ? 160 : 420, [halfW * 0.95, halfH * 0.95]), [stats, compact, halfW, halfH]);
  const mix = useRef([0, 0, 0, 0, 0, 0]);
  const hover = useRef(-1);
  const t0 = useRef(performance.now());

  const stars = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(sky.positions.slice(0, sky.count * 3), 3));
    g.setAttribute('aCat', new THREE.BufferAttribute(sky.cat, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sky.seed, 1));
    g.setAttribute('aIndex', new THREE.BufferAttribute(Float32Array.from({ length: sky.count }, (_, i) => i), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false,
      blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uCat: { value: [0, 0, 0, 0, 0, 0] }, uDim: { value: 0 }, uHover: { value: -1 },
        uPixelRatio: { value: gl.getPixelRatio() }, uColors: { value: categoryColorUniform(light) },
        uNeutral: { value: new THREE.Vector3(...new THREE.Color(light ? '#6B6D78' : '#C9CAD1').toArray()) },
      },
    });
    return new THREE.Points(g, m);
  }, [sky, gl, light]);

  const arrow = useMemo(() => {
    const v = (p: readonly [number, number] | readonly number[]) => new THREE.Vector3(p[0] * arrowScale, -(p[1] + 128) * arrowScale, 0.2);
    const tip = v(ARROW.tip), left = v(ARROW.left), notch = v(ARROW.notch), right = v(ARROW.right);
    // Recorrido: punta, ala izquierda, muesca, ala derecha, punta y lomo central.
    const route = [tip, left, notch, right, tip, notch];
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s < route.length - 1; s++) {
      for (let k = 0; k < 40; k++) pts.push(route[s].clone().lerp(route[s + 1], k / 40));
    }
    pts.push(route[route.length - 1].clone());
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    lineGeo.setDrawRange(0, 0);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#1774FD', transparent: true, opacity: 0.9 }));
    const facet = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: string) => new THREE.Mesh(
      new THREE.BufferGeometry().setFromPoints([a, b, c]),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    const fl = facet(tip, left, notch, '#1774FD');
    const fr = facet(tip, notch, right, '#0F58DE');
    const nodes = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints([left, notch, right]),
      new THREE.PointsMaterial({ color: light ? '#0F58DE' : '#A9CAFF', size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0 }),
    );
    const flare = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.ShaderMaterial({
        vertexShader: FLARE_VERT, fragmentShader: FLARE_FRAG, transparent: true, depthWrite: false,
        blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
        uniforms: { uPulse: { value: 0 }, uColor: { value: new THREE.Color('#1774FD') } },
      }),
    );
    flare.position.copy(tip).setZ(0.25);
    return { line, total: pts.length, fl, fr, nodes, flare, tip };
  }, [arrowScale, light]);

  const group = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();
    const t = (now - t0.current) / 1000;
    const sm = stars.material as THREE.ShaderMaterial;
    sm.uniforms.uTime.value = st.clock.elapsedTime;
    const active = bus.category ? CATEGORIES.indexOf(bus.category) : -1;
    sm.uniforms.uDim.value = stepCategoryMix(mix.current, active, dt).max;
    sm.uniforms.uCat.value = mix.current;

    // Las líneas se dibujan solas (2,6 s) y después aparecen las facetas.
    const p = Math.min(1, Math.max(0, (t - 0.4) / 2.6));
    const eased = 1 - Math.pow(1 - p, 3);
    arrow.line.geometry.setDrawRange(0, Math.floor(eased * arrow.total));
    const fill = Math.max(0, Math.min(1, (t - 2.8) / 1.2));
    const pulse = Math.exp(-(now - bus.ctaPulseAt) / 600);
    const hot = bus.ctaHover ? 1 : 0;
    (arrow.fl.material as THREE.MeshBasicMaterial).opacity = fill * (0.16 + hot * 0.2);
    (arrow.fr.material as THREE.MeshBasicMaterial).opacity = fill * (0.12 + hot * 0.2);
    (arrow.nodes.material as THREE.PointsMaterial).opacity = Math.min(1, p * 1.4);
    (arrow.line.material as THREE.LineBasicMaterial).opacity = 0.75 + hot * 0.25;
    // La estrella polar late con el CTA.
    const beat = hot ? 0.5 + 0.5 * Math.sin(now / 160) : 0;
    const fm = arrow.flare.material as THREE.ShaderMaterial;
    fm.uniforms.uPulse.value = Math.max(pulse, beat);
    const sc = 1 + pulse * 0.9 + beat * 0.35;
    arrow.flare.scale.setScalar(sc);

    // Parallax suave con el cursor y vuelo hacia adelante con el scroll.
    const px = bus.pointer ? bus.pointer.x / window.innerWidth - 0.5 : Math.sin(t * 0.15) * 0.08;
    const py = bus.pointer ? bus.pointer.y / window.innerHeight - 0.5 : 0;
    camera.position.x += (px * 0.9 - camera.position.x) * Math.min(1, dt * 2.5);
    camera.position.y += (-py * 0.6 - camera.position.y) * Math.min(1, dt * 2.5);
    camera.position.z += (10 - bus.scroll * 8.5 - camera.position.z) * Math.min(1, dt * 8);
    camera.lookAt(0, 0, 0);

    // Estrella polar en pantalla: el glow del shader de fondo la sigue.
    const rect = gl.domElement.getBoundingClientRect();
    if (group.current) {
      tmp.copy(arrow.tip).add(group.current.position).project(camera);
      bus.glowPoint = { x: rect.left + (tmp.x + 1) / 2 * rect.width, y: rect.top + (1 - tmp.y) / 2 * rect.height };
    }

    // Hover de estrella: la más cercana al cursor en pantalla (radio 18 px).
    const tip = tooltip.current;
    let best = -1;
    if (bus.pointer && tip) {
      const mx = bus.pointer.x - rect.left;
      const my = bus.pointer.y - rect.top;
      let bestD = 18 * 18;
      const pos = stars.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < sky.count; i++) {
        tmp.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).project(camera);
        const sx = (tmp.x + 1) / 2 * rect.width;
        const sy = (1 - tmp.y) / 2 * rect.height;
        const d = (sx - mx) ** 2 + (sy - my) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0) {
        tmp.set(pos[best * 3], pos[best * 3 + 1], pos[best * 3 + 2]).project(camera);
        tip.style.transform = `translate(${(tmp.x + 1) / 2 * rect.width}px, ${(1 - tmp.y) / 2 * rect.height}px)`;
      }
    }
    if (tip && best !== hover.current) {
      hover.current = best;
      if (best < 0) tip.dataset.show = 'false';
      else {
        const ci = sky.cat[best];
        let text = 'Miembro de la comunidad';
        if (ci >= 0) {
          const name = CATEGORIES[ci];
          const n = stats?.categories[name] ?? 0;
          text = `${name} · ${n} en la comunidad`;
          if (sky.perParticle > 1) text += ` (cada estrella son ${sky.perParticle})`;
        }
        tip.textContent = text;
        tip.dataset.show = 'true';
      }
    }
    sm.uniforms.uHover.value = best;
  });

  return (
    <>
      <primitive object={stars} />
      <group ref={group} position={[arrowX, 0, 0]}>
        <primitive object={arrow.fl} />
        <primitive object={arrow.fr} />
        <primitive object={arrow.line} />
        <primitive object={arrow.nodes} />
        <primitive object={arrow.flare} />
      </group>
    </>
  );
}

export default function ConstellationScene({ compact, light, active, stats, onReady, tooltip }: Props) {
  return (
    <Canvas
      className="hero-canvas"
      dpr={[1, compact ? 1.5 : 1.75]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'default' }}
      camera={{ fov: 38, position: [0, 0, 10], near: 0.1, far: 50 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
      aria-hidden="true"
    >
      <Constellation compact={compact} light={light} stats={stats} tooltip={tooltip} />
    </Canvas>
  );
}
