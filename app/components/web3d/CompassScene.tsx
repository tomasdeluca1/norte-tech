"use client";

// Hero A' · "La brújula viva" (desktop; en mobile no hay Three.js).
// La brújula del logo en 3D. Física de la aguja (DISENO-ITERACION §P0-1):
// - Reposo: apunta al norte con una "búsqueda" de ±3° cada 6 s.
// - Sigue al cursor: limitado a ±40° del norte. Nunca se cae.
// - Snap al CTA (hover o foco en [data-hero-cta]): apunta al botón sin límite y late una vez.
// - Al salir del CTA vuelve a seguir el cursor o al norte.
// Alrededor, 1 punto = 1 miembro real, en 6 sectores ordenados por categoría.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, ExtrudeGeometry, Group, Mesh,
  MeshBasicMaterial, ShaderMaterial, Shape, Vector3, MathUtils,
} from 'three';
import { CATEGORIES, type CommunityStats } from '@/lib/categories';
import { bus, screenAngle, angleDelta } from './bus';
import { buildLayout, makeParticleGeometry, categoryColorUniform, restColorUniform, stepCategoryMix, PARTICLE_VERT, PARTICLE_FRAG } from './particles';

export interface SceneProps {
  compact: boolean;
  light: boolean;
  active: boolean;
  stats: CommunityStats | null;
  onReady: () => void;
}

const S = 0.01; // unidades del SVG del logo -> mundo
const DEG = Math.PI / 180;
const MAX_FOLLOW = 40 * DEG;
const SPRING = { home: [60, 12], follow: [90, 14], snap: [170, 22] } as const;
const AMBER = '#FFA23A'; // tick norte del bisel (único ámbar de la brújula)
const IDLE_AFTER_MS = 2000;
const SEARCH_MS = 12000; // "búsqueda" ±3° durante dos períodos y después queda quieta (0 % CPU)

function polyShape(points: [number, number][]) {
  const s = new Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x * S, -y * S) : s.moveTo(x * S, -y * S)));
  s.closePath();
  return s;
}

function ringArc(a0: number, a1: number, rOut: number, rIn: number) {
  const s = new Shape();
  s.absarc(0, 0, rOut, a0, a1, false);
  s.absarc(0, 0, rIn, a1, a0, true);
  s.closePath();
  return s;
}

/** Faceta de la flecha con el relieve del logo, pero rígida (notch 0,06, tip 0,03). */
function facetGeometry(side: -1 | 1) {
  const tip = new Vector3(0, 2.68, 0.03);
  const corner = new Vector3(side * 1.255, -0.11, 0);
  const notch = new Vector3(0, 0.71, 0.06);
  const g = new BufferGeometry().setFromPoints(side < 0 ? [tip, corner, notch] : [tip, notch, corner]);
  g.computeVertexNormals();
  return g;
}

function mergeBoxes(list: BufferGeometry[]): BufferGeometry {
  // Merge mínimo (evita importar BufferGeometryUtils): todas son BoxGeometry indexadas.
  let vCount = 0;
  let iCount = 0;
  list.forEach((g) => { vCount += g.attributes.position.count; iCount += g.index!.count; });
  const pos = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  list.forEach((g) => {
    pos.set(g.attributes.position.array as Float32Array, vo * 3);
    const gi = g.index!.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count;
    io += gi.length;
    g.dispose();
  });
  const m = new BufferGeometry();
  m.setAttribute('position', new BufferAttribute(pos, 3));
  m.setIndex(new BufferAttribute(idx, 1));
  return m;
}

function Compass({ compact }: { compact: boolean }) {
  const group = useRef<Group>(null);
  const needle = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const ringMat = useRef<MeshBasicMaterial>(null);
  const st = useRef({ angle: 0, vel: 0, t0: performance.now(), wasSnap: false });
  const { camera, invalidate } = useThree();

  const geo = useMemo(() => {
    const extrude = { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.02, bevelSegments: 2, curveSegments: compact ? 32 : 64 };
    const arcs = new ExtrudeGeometry([ringArc(106.8 * DEG, 260.6 * DEG, 1.95, 1.75), ringArc(-80.6 * DEG, 73.2 * DEG, 1.95, 1.75)], extrude);
    const marks = new ExtrudeGeometry([
      polyShape([[-255, 0], [-179, -15], [-179, 15]]),
      polyShape([[255, 0], [179, -15], [179, 15]]),
      polyShape([[0, 131], [14, 176], [0, 230], [-14, 176]]),
    ], { ...extrude, depth: 0.08 });
    // Bisel: marca cada 10°, más larga en los cardinales. La de 0° va aparte, en ámbar y 3x de ancho.
    const ticks: BufferGeometry[] = [];
    for (let d = 10; d < 360; d += 10) {
      const len = d % 90 === 0 ? 0.16 : 0.07;
      const b = new BoxGeometry(0.012, len, 0.01);
      b.translate(0, 2.34 - len / 2, 0);
      b.rotateZ(-d * DEG);
      ticks.push(b);
    }
    const north = new BoxGeometry(0.036, 0.16, 0.012);
    north.translate(0, 2.34 - 0.08, 0.002);
    return { arcs, marks, ticks: mergeBoxes(ticks), north, left: facetGeometry(-1), right: facetGeometry(1) };
  }, [compact]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = st.current;
    const now = performance.now();
    const r = bus.stage;
    if (!r) return;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    const snap = bus.ctaHover && !!bus.cta;
    const mode: keyof typeof SPRING = snap ? 'snap' : bus.pointer ? 'follow' : 'home';
    let target = 0;
    if (snap) target = screenAngle(cx, cy, bus.cta!.x, bus.cta!.y);
    else if (bus.pointer) target = MathUtils.clamp(screenAngle(cx, cy, bus.pointer.x, bus.pointer.y), -MAX_FOLLOW, MAX_FOLLOW);
    else if (now - s.t0 < SEARCH_MS) target = Math.sin(((now - s.t0) / 1000) * ((Math.PI * 2) / 6)) * 3 * DEG;
    if (s.wasSnap && !snap && !bus.pointer) s.t0 = now; // vuelve al norte y retoma la búsqueda
    s.wasSnap = snap;

    const [k, c] = SPRING[mode];
    const d = angleDelta(s.angle, target);
    s.vel += (k * d - c * s.vel) * dt;
    s.angle += s.vel * dt;
    bus.needle = s.angle;
    const reach = Math.min(r.w, r.h) * 0.3;
    bus.glowPoint = { x: cx + Math.sin(s.angle) * reach, y: cy - Math.cos(s.angle) * reach };
    if (needle.current) needle.current.rotation.z = -s.angle;

    // Pulso único al entrar al CTA: anillo de radio 2,0 -> 2,6, opacidad 0,7 -> 0.
    const p = Math.exp(-(now - bus.ctaPulseAt) / 450);
    if (ring.current && ringMat.current) {
      ring.current.visible = p > 0.01;
      const rad = 2.0 + (1 - p) * 0.6;
      ring.current.scale.set(rad, rad, 1);
      ringMat.current.opacity = p * 0.7;
    }

    // Scroll: la cámara entra por el centro de la brújula (transición a "Qué es").
    const sc = bus.scroll;
    const camZ = 10 - sc * 9.2;
    camera.position.z = MathUtils.lerp(camera.position.z, camZ, Math.min(1, dt * 8));
    let settling = Math.abs(camera.position.z - camZ) > 0.001;
    if (group.current) {
      const rx = -0.18 + sc * 0.6;
      const px = bus.pointer ? bus.pointer.x / window.innerWidth - 0.5 : 0;
      const ry = MathUtils.clamp(px * 0.24, -0.12, 0.12); // parallax máx. ±0,12 rad
      group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, rx, Math.min(1, dt * 6));
      group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, ry, Math.min(1, dt * 3));
      settling = settling || Math.abs(group.current.rotation.x - rx) > 0.0005 || Math.abs(group.current.rotation.y - ry) > 0.0005;
    }

    // Render bajo demanda: seguimos pidiendo frames mientras algo se mueva.
    const moving = Math.abs(s.vel) > 0.001 || Math.abs(d) > 0.001 || p > 0.01 || settling
      || (!bus.pointer && !snap && now - s.t0 < SEARCH_MS)
      || now - bus.pointerAt < IDLE_AFTER_MS;
    if (moving) invalidate();
  });

  return (
    <group ref={group}>
      {/* El dial no gira: las marcas cardinales quedan derechas. */}
      <mesh geometry={geo.arcs}>
        <meshStandardMaterial color="#5E5E5E" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh geometry={geo.marks}>
        <meshStandardMaterial color="#5E5E5E" metalness={0.5} roughness={0.38} />
      </mesh>
      <mesh geometry={geo.ticks}>
        <meshBasicMaterial color="#34343C" toneMapped={false} />
      </mesh>
      <mesh geometry={geo.north}>
        <meshBasicMaterial color={AMBER} toneMapped={false} />
      </mesh>
      {/* Aguja en colores planos de marca: ningún píxel fuera de #1774FD / #0F58DE. */}
      <group ref={needle} position={[0, 0, 0.14]}>
        <mesh geometry={geo.left}>
          <meshBasicMaterial color="#1774FD" side={DoubleSide} toneMapped={false} />
        </mesh>
        <mesh geometry={geo.right}>
          <meshBasicMaterial color="#0F58DE" side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={ring} visible={false} position={[0, 0, 0.1]}>
        <ringGeometry args={[0.992, 1, 128]} />
        <meshBasicMaterial ref={ringMat} color="#1774FD" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Members({ compact, light, stats }: { compact: boolean; light: boolean; stats: CommunityStats | null }) {
  const { gl, invalidate } = useThree();
  const layout = useMemo(() => buildLayout(stats, compact ? 160 : 420), [stats, compact]);
  const geometry = useMemo(() => makeParticleGeometry(layout), [layout]);
  const mix = useRef([0, 0, 0, 0, 0, 0]);
  const time = useRef(0); // tiempo propio: con render bajo demanda la órbita no salta al despertar
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCat: { value: [0, 0, 0, 0, 0, 0] },
      uDim: { value: 0 },
      uSize: { value: 5.2 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uColors: { value: categoryColorUniform(light) },
      uRest: { value: restColorUniform() },
    },
  }), [light, gl]);

  useFrame((_, dt) => {
    const u = material.uniforms;
    time.current += Math.min(dt, 1 / 30);
    u.uTime.value = time.current;
    const active = bus.category ? CATEGORIES.indexOf(bus.category) : -1;
    const { max, moving } = stepCategoryMix(mix.current, active, Math.min(dt, 0.05));
    u.uDim.value = max;
    u.uCat.value = mix.current;
    if (moving) invalidate();
  });

  if (!layout.live) return null;
  return <points geometry={geometry} material={material} />;
}

function Wake() {
  const { invalidate } = useThree();
  bus.wake = invalidate;
  return null;
}

export default function CompassScene({ compact, light, active, stats, onReady }: SceneProps) {
  return (
    <Canvas
      className="hero-canvas"
      dpr={[1, compact ? 1.5 : 1.75]}
      frameloop={active ? 'demand' : 'never'}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'default' }}
      camera={{ fov: 38, position: [0, 0, 10], near: 0.1, far: 50 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
      aria-hidden="true"
    >
      <ambientLight intensity={light ? 1.4 : 1.0} />
      <directionalLight position={[-3, 4, 6]} intensity={1.3} />
      <directionalLight position={[4, -2, 3]} intensity={0.6} color="#A9CAFF" />
      <Wake />
      <Compass compact={compact} />
      <Members compact={compact} light={light} stats={stats} />
    </Canvas>
  );
}
