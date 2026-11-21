// Terreno com relevo suave, cores variadas (grama, terra, estrada) e rio.
import React, { useMemo } from 'react';
import * as THREE from 'three';

export const TAM_MUNDO = 420;

// ruído simples e determinístico (soma de ondas) — mesmo resultado no celular e no PC
const r = (x: number, z: number, f: number, s: number) => Math.sin(x * f + s) * Math.cos(z * f * 1.3 - s * 0.7);
export function ruido(x: number, z: number) {
  return r(x, z, 0.018, 1.2) * 0.55 + r(x, z, 0.041, 3.1) * 0.28 + r(x, z, 0.09, 7.7) * 0.12 + r(x, z, 0.21, 2.4) * 0.05;
}

// Estrada de terra serpenteando pelo mapa
export const distEstrada = (x: number, z: number) => Math.abs(x - Math.sin(z * 0.025) * 18 - 6);
// Rio a leste
export const distRio = (x: number, z: number) => Math.abs(x - (70 + Math.sin(z * 0.03) * 12));
export const ALTURA_AGUA = -1.2;

export function altura(x: number, z: number) {
  const d = Math.hypot(x, z);
  const vila = THREE.MathUtils.smoothstep(d, 22, 55);          // plano na aldeia
  const borda = THREE.MathUtils.smoothstep(d, 120, 190) * 22;  // sobe para as montanhas
  let h = ruido(x, z) * 6 * vila + borda;
  const rio = distRio(x, z);
  if (rio < 9) h = THREE.MathUtils.lerp(ALTURA_AGUA - 1.4, h, THREE.MathUtils.smoothstep(rio, 3, 9));
  const est = distEstrada(x, z);
  if (est < 4) h = THREE.MathUtils.lerp(h * 0.6, h, est / 4);
  return h;
}

const C = {
  grama1: new THREE.Color('#5d8a3a'), grama2: new THREE.Color('#7ea446'), grama3: new THREE.Color('#47702e'),
  terra: new THREE.Color('#9a7a4f'), areia: new THREE.Color('#c9b182'), pedra: new THREE.Color('#7d776b'),
};

export function Terreno({ segmentos = 220 }: { segmentos?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(TAM_MUNDO, TAM_MUNDO, segmentos, segmentos);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const cores = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = altura(x, z);
      pos.setY(i, h);
      const n = ruido(x * 3.1, z * 3.1);
      c.copy(C.grama1).lerp(n > 0 ? C.grama2 : C.grama3, Math.abs(n) * 1.4);
      const est = distEstrada(x, z); if (est < 3.2) c.lerp(C.terra, 1 - est / 3.2);
      const praca = Math.hypot(x, z); if (praca < 14) c.lerp(C.terra, THREE.MathUtils.smoothstep(14 - praca, 0, 4) * 0.85);
      const rio = distRio(x, z); if (rio < 11) c.lerp(C.areia, 1 - THREE.MathUtils.smoothstep(rio, 6, 11));
      if (h > 12) c.lerp(C.pedra, THREE.MathUtils.smoothstep(h, 12, 22));
      cores.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    g.computeVertexNormals();
    return g;
  }, [segmentos]);

  return (
    <>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {/* rio */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[70, ALTURA_AGUA, 0]}>
        <planeGeometry args={[40, TAM_MUNDO]} />
        <meshStandardMaterial color="#3b7fa0" transparent opacity={0.82} roughness={0.08} metalness={0.3} />
      </mesh>
    </>
  );
}
