"use client";

// Hero A · "La brújula viva". La brújula del logo en 3D: la aguja busca el
// cursor con inercia y, cuando el cursor (o el foco) entra al CTA del meetup,
// hace snap y apunta al botón con un pulso azul. Alrededor, los miembros
// reales como partículas agrupadas por categoría.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CATEGORIES, type CommunityStats } from '@/lib/categories';
import { bus, screenAngle, angleDelta } from './bus';
import {
  buildLayout, makeParticleGeometry, categoryColorUniform, stepCategoryMix,
  PARTICLE_VERT, PARTICLE_FRAG,
} from './particles';

export interface SceneProps {
  compact: boolean;
  light: boolean;
  active: boolean;
  stats: CommunityStats | null;
  onReady: () => void;
}

const S = 0.01; // unidades del SVG del logo -> mundo

/** Ámbar brújula: se lee de --nt-accent (tokens.css) para que el hex final cambie en un solo lugar. */
const AMBER = typeof window !== 'undefined'
  ? (getComputedStyle(document.documentElement).getPropertyValue('--nt-amber-400').trim() || '#FFA23A')
  : '#FFA23A';

function polyShape(points: [number, number][]) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x * S, -y * S) : s.moveTo(x * S, -y * S)));
  s.closePath();
  return s;
}

function ringArc(a0: number, a1: number, rOut: number, rIn: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, a0, a1, false);
  s.absarc(0, 0, rIn, a1, a0, true);
  s.closePath();
  return s;
}

/** Faceta de la flecha con relieve: el lomo central sube en z, como el logo con dos caras. */
function facetGeometry(side: -1 | 1) {
  const tip = new THREE.Vector3(0, 2.68, 0.06);
  const corner = new THREE.Vector3(side * 1.255, -0.11, 0);
  const notch = new THREE.Vector3(0, 0.71, 0.22);
  const g = new THREE.BufferGeometry().setFromPoints(side < 0 ? [tip, corner, notch] : [tip, notch, corner]);
  g.computeVertexNormals();
  return g;
}

function Compass({ compact }: { compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dial = useRef<THREE.Group>(null);
  const needle = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const matL = useRef<THREE.MeshStandardMaterial>(null);
  const matR = useRef<THREE.MeshStandardMaterial>(null);
  const state = useRef({ angle: 0, vel: 0, dial: 0, t0: performance.now() });
  const { gl, camera } = useThree();

  const geo = useMemo(() => {
    const deg = Math.PI / 180;
    const extrude = { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.02, bevelSegments: 2, curveSegments: compact ? 32 : 64 };
    const arcs = new THREE.ExtrudeGeometry(
      [ringArc(106.8 * deg, 260.6 * deg, 1.95, 1.75), ringArc(-80.6 * deg, 73.2 * deg, 1.95, 1.75)], extrude);
    const marks = new THREE.ExtrudeGeometry([
      polyShape([[-255, 0], [-179, -15], [-179, 15]]),
      polyShape([[255, 0], [179, -15], [179, 15]]),
      polyShape([[0, 131], [14, 176], [0, 230], [-14, 176]]),
    ], { ...extrude, depth: 0.08 });
    // Bisel de marcas cada 10°, más largas en los cardinales (motivo de brújula de la marca).
    const ticks: THREE.BufferGeometry[] = [];
    for (let d = 0; d < 360; d += 10) {
      const long = d % 90 === 0;
      const len = long ? 0.16 : 0.07;
      const b = new THREE.BoxGeometry(0.012, len, 0.01);
      b.translate(0, 2.34 - len / 2, 0);
      b.rotateZ(-d * deg);
      ticks.push(b);
    }
    const tickGeo = mergeBoxes(ticks);
    // Cola sur de la aguja en ámbar brújula (--nt-accent): marca el lado opuesto al norte.
    const tail = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.2, -0.11, 0.02), new THREE.Vector3(0, -0.98, 0.0), new THREE.Vector3(0, -0.11, 0.12),
      new THREE.Vector3(0, -0.11, 0.12), new THREE.Vector3(0, -0.98, 0.0), new THREE.Vector3(0.2, -0.11, 0.02),
    ]);
    tail.computeVertexNormals();
    return { arcs, marks, tickGeo, tail, left: facetGeometry(-1), right: facetGeometry(1) };
  }, [compact]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const st = state.current;
    const now = performance.now();
    const rect = gl.domElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Objetivo de la aguja: el CTA cuando está en hover/foco; si no, el cursor;
    // sin cursor (touch), el CTA con una búsqueda suave.
    const ctaAngle = bus.cta ? screenAngle(cx, cy, bus.cta.x, bus.cta.y) : 0;
    let target: number;
    const t = (now - st.t0) / 1000;
    if (bus.ctaHover && bus.cta) target = ctaAngle;
    else if (bus.pointer) target = screenAngle(cx, cy, bus.pointer.x, bus.pointer.y);
    else target = ctaAngle + Math.sin(t * 0.9) * 0.22 * (1 + Math.sin(t * 0.23));

    const snap = bus.ctaHover;
    const k = snap ? 140 : 16;
    const c = snap ? 20 : 4.2;
    const d = angleDelta(st.angle, target);
    st.vel += (k * d - c * st.vel) * dt;
    st.angle += st.vel * dt;
    bus.needle = st.angle;
    const reach = Math.min(rect.width, rect.height) * 0.3;
    bus.glowPoint = { x: cx + Math.sin(st.angle) * reach, y: cy - Math.cos(st.angle) * reach };
    if (needle.current) needle.current.rotation.z = -st.angle;

    // El dial gira para que su norte quede bajo la aguja: el norte es el meetup.
    const dialTarget = snap ? st.angle : 0;
    st.dial += angleDelta(st.dial, dialTarget) * Math.min(1, dt * (snap ? 7 : 2));
    if (dial.current) dial.current.rotation.z = -st.dial;

    // Pulso de luz azul al entrar al CTA.
    const pulse = Math.exp(-(now - bus.ctaPulseAt) / 450);
    if (light.current) light.current.intensity = 6 + (snap ? 8 : 0) + pulse * 60;
    const glow = 0.28 + (snap ? 0.25 : 0) + pulse * 0.9;
    if (matL.current) matL.current.emissiveIntensity = glow;
    if (matR.current) matR.current.emissiveIntensity = glow;

    // Scroll: la cámara entra por el centro de la brújula.
    const s = bus.scroll;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 10 - s * 9.2, Math.min(1, dt * 8));
    if (group.current) {
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -0.18 + s * 0.6, Math.min(1, dt * 6));
      // Leve parallax con el cursor (no en touch).
      const px = bus.pointer ? (bus.pointer.x / window.innerWidth - 0.5) : 0;
      const py = bus.pointer ? (bus.pointer.y / window.innerHeight - 0.5) : 0;
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, px * 0.35, Math.min(1, dt * 3));
      group.current.rotation.x += py * 0.004;
    }
  });

  return (
    <group ref={group}>
      <group ref={dial}>
        <mesh geometry={geo.arcs}>
          <meshStandardMaterial color="#5E5E5E" metalness={0.55} roughness={0.32} />
        </mesh>
        <mesh geometry={geo.marks}>
          <meshStandardMaterial color="#5E5E5E" metalness={0.5} roughness={0.38} />
        </mesh>
        <mesh geometry={geo.tickGeo}>
          <meshBasicMaterial color="#5E5E5E" transparent opacity={0.7} />
        </mesh>
      </group>
      <group ref={needle} position={[0, 0, 0.14]}>
        <mesh geometry={geo.left}>
          <meshStandardMaterial ref={matL} color="#1774FD" emissive="#1774FD" emissiveIntensity={0.3} metalness={0.1} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.right}>
          <meshStandardMaterial ref={matR} color="#0F58DE" emissive="#0F58DE" emissiveIntensity={0.3} metalness={0.1} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.tail}>
          <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.35} metalness={0.1} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        <pointLight ref={light} position={[0, 2.2, 0.9]} color="#1774FD" intensity={6} distance={6} decay={1.6} />
      </group>
    </group>
  );
}

function mergeBoxes(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

function Members({ compact, light, stats }: { compact: boolean; light: boolean; stats: CommunityStats | null }) {
  const { gl } = useThree();
  const layout = useMemo(() => buildLayout(stats, compact ? 160 : 420, compact ? 90 : 180), [stats, compact]);
  const geometry = useMemo(() => makeParticleGeometry(layout), [layout]);
  const mix = useRef([0, 0, 0, 0, 0, 0]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCat: { value: [0, 0, 0, 0, 0, 0] },
      uDim: { value: 0 },
      uSize: { value: compact ? 6.4 : 6.2 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uInner: { value: 2.05 },
      uColors: { value: categoryColorUniform(light) },
      uNeutral: { value: new THREE.Vector3(...new THREE.Color(light ? '#6B6D78' : '#A5A6B0').toArray()) },
    },
  }), [compact, light, gl]);

  useFrame((st, dt) => {
    const u = material.uniforms;
    u.uTime.value = st.clock.elapsedTime;
    const active = bus.category ? CATEGORIES.indexOf(bus.category) : -1;
    u.uDim.value = stepCategoryMix(mix.current, active, Math.min(dt, 0.05));
    u.uCat.value = mix.current;
  });

  return <points geometry={geometry} material={material} />;
}

export default function CompassScene({ compact, light, active, stats, onReady }: SceneProps) {
  return (
    <Canvas
      className="hero-canvas"
      dpr={[1, compact ? 1.5 : 2]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
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
      <Compass compact={compact} />
      <Members compact={compact} light={light} stats={stats} />
    </Canvas>
  );
}
