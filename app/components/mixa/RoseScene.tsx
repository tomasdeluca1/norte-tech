"use client";

// Rosa de los vientos 3D de "Qué es". Gira con el scroll y trae cada punto
// cardinal al frente; el punto que queda al norte se enciende en azul (es la
// tarjeta activa). La rotación llega por `rot` (mutable) desde WindRose.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface RoseState { rot: number }

const BLUE_L = new THREE.Color('#1774FD');
const BLUE_R = new THREE.Color('#0F58DE');
const GRAY_L = new THREE.Color('#6B6D78');
const GRAY_R = new THREE.Color('#34343C');

function pointFacets(len: number, half: number, height: number) {
  // Punta hacia +y; dos facetas con lomo elevado, como la flecha del logo.
  const tip = new THREE.Vector3(0, len, 0.02);
  const base = new THREE.Vector3(0, 0, height);
  const l = new THREE.Vector3(-half, half, 0);
  const r = new THREE.Vector3(half, half, 0);
  const left = new THREE.BufferGeometry().setFromPoints([tip, l, base]);
  const right = new THREE.BufferGeometry().setFromPoints([tip, base, r]);
  left.computeVertexNormals();
  right.computeVertexNormals();
  return { left, right };
}

function Rose({ state }: { state: RoseState }) {
  const spin = useRef<THREE.Group>(null);
  const long = useMemo(() => pointFacets(1.95, 0.34, 0.22), []);
  const short = useMemo(() => pointFacets(1.15, 0.24, 0.14), []);
  const mats = useMemo(() => [0, 1, 2, 3].map(() => ({
    l: new THREE.MeshStandardMaterial({ color: GRAY_L.clone(), metalness: 0.35, roughness: 0.4, side: THREE.DoubleSide }),
    r: new THREE.MeshStandardMaterial({ color: GRAY_R.clone(), metalness: 0.35, roughness: 0.4, side: THREE.DoubleSide }),
  })), []);
  const shortMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A4C57', metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide }), []);
  const ring = useMemo(() => new THREE.RingGeometry(2.08, 2.12, 128), []);
  const ring2 = useMemo(() => new THREE.RingGeometry(1.32, 1.335, 96), []);
  const shown = useRef(0);

  useFrame((_, dt) => {
    shown.current += (state.rot - shown.current) * Math.min(1, dt * 10);
    if (spin.current) spin.current.rotation.z = shown.current;
    // Cuánto mira cada punto largo al norte de la pantalla (1 = al frente).
    mats.forEach((m, i) => {
      const front = Math.pow(Math.max(0, Math.cos(-i * Math.PI / 2 + shown.current)), 6);
      m.l.color.copy(GRAY_L).lerp(BLUE_L, front);
      m.r.color.copy(GRAY_R).lerp(BLUE_R, front);
      m.l.emissive.copy(BLUE_L).multiplyScalar(front * 0.35);
      m.r.emissive.copy(BLUE_R).multiplyScalar(front * 0.35);
    });
  });

  return (
    <group rotation={[-0.62, 0, 0]}>
      <mesh geometry={ring}><meshBasicMaterial color="#5E5E5E" transparent opacity={0.8} /></mesh>
      <mesh geometry={ring2}><meshBasicMaterial color="#5E5E5E" transparent opacity={0.45} /></mesh>
      <group ref={spin}>
        {[0, 1, 2, 3].map((i) => (
          <group key={`l${i}`} rotation={[0, 0, -i * (Math.PI / 2)]}>
            <mesh geometry={long.left} material={mats[i].l} />
            <mesh geometry={long.right} material={mats[i].r} />
          </group>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <group key={`s${i}`} rotation={[0, 0, -Math.PI / 4 - i * (Math.PI / 2)]}>
            <mesh geometry={short.left} material={shortMat} />
            <mesh geometry={short.right} material={shortMat} />
          </group>
        ))}
        <mesh position={[0, 0, 0.24]}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#C9CAD1" />
        </mesh>
      </group>
    </group>
  );
}

export default function RoseScene({ state, active }: { state: RoseState; active: boolean }) {
  return (
    <Canvas
      className="rose-canvas"
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 32, position: [0, 0, 8.2] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      aria-hidden="true"
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[-3, 5, 6]} intensity={2.4} />
      <directionalLight position={[3, -3, 2]} intensity={0.5} color="#A9CAFF" />
      <Rose state={state} />
    </Canvas>
  );
}
