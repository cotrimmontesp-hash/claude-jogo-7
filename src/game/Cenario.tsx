// Cenário: aldeia, fazenda, Refúgio do Clã, floresta, pedras, montanhas, nuvens e fogo.
// Objetos repetidos usam "instancing" (uma só chamada de desenho por tipo) para rodar bem no celular.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { useGLTF } from './drei';
import { modelo, ESCALA } from './modelos';
import { altura, distEstrada, distRio } from './Terreno';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';
import { aplicarVento } from './Efeitos';

export interface Transf { p: [number, number, number]; r: number; s: number }

// aleatório com semente: o mapa é sempre igual
function semente(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- Instancing ----------
function Instancias({ arquivo, lista, sombra = true }: { arquivo: string; lista: Transf[]; sombra?: boolean }) {
  const { scene } = useGLTF(modelo(arquivo));
  const partes = useMemo(() => {
    scene.updateMatrixWorld(true);
    const out: { geo: THREE.BufferGeometry; mat: THREE.Material; m: THREE.Matrix4 }[] = [];
    const balanca = /tree|cloud/.test(arquivo);
    scene.traverse((o: any) => { if (o.isMesh) out.push({ geo: o.geometry, mat: balanca ? aplicarVento(o.material, /cloud/.test(arquivo) ? 0.15 : 0.06, 1, /tree/.test(arquivo)) : o.material, m: o.matrixWorld.clone() }); });
    return out;
  }, [scene, arquivo]);
  return <>{partes.map((pt, i) => <ParteInstanciada key={i} {...pt} lista={lista} sombra={sombra} />)}</>;
}

function ParteInstanciada({ geo, mat, m, lista, sombra }: { geo: THREE.BufferGeometry; mat: THREE.Material; m: THREE.Matrix4; lista: Transf[]; sombra: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current; if (!im) return;
    const t = new THREE.Matrix4(), q = new THREE.Quaternion(), y = new THREE.Vector3(0, 1, 0);
    lista.forEach((l, i) => {
      t.compose(new THREE.Vector3(...l.p), q.setFromAxisAngle(y, l.r), new THREE.Vector3(l.s, l.s, l.s)).multiply(m);
      im.setMatrixAt(i, t);
    });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
  }, [lista, m]);
  return <instancedMesh ref={ref} args={[geo, mat, lista.length]} castShadow={sombra} receiveShadow frustumCulled={false} />;
}

// ---------- Layout do mapa ----------
const noChao = (x: number, z: number, r: number, s: number, afundar = 0.15): Transf => ({ p: [x, altura(x, z) - afundar, z], r, s });
const livre = (x: number, z: number, folga: number) => distEstrada(x, z) > folga && distRio(x, z) > folga + 4;

export const REFUGIO: [number, number] = [-82, -72];   // base do clã
export const CASAS_EM_CHAMAS: [number, number][] = [[24, 18], [-26, 22], [30, -16]];

function gerarLayout() {
  const rnd = semente(1789);
  const L: Record<string, Transf[]> = {};
  const add = (k: string, t: Transf) => (L[k] ??= []).push(t);
  const S = ESCALA.cenario;

  // Aldeia: praça com poço, igreja ao norte, comércio ao redor
  add('cenario/well_red', noChao(0, 0, 0, S));
  add('cenario/church_red', noChao(-2, -30, 0, S * 1.25));
  add('cenario/tavern_red', noChao(-20, -8, Math.PI / 2, S));
  add('cenario/blacksmith_red', noChao(20, -6, -Math.PI / 2, S));
  add('cenario/market_yellow', noChao(-6, 18, Math.PI, S));
  add('cenario/tower_A_red', noChao(-40, -40, 0, S));
  const tiposCasa = ['cenario/home_A_red', 'cenario/home_B_red', 'cenario/home_A_yellow', 'cenario/home_B_blue'];
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2, d = 24 + rnd() * 26, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!livre(x, z, 7) || Math.hypot(x + 2, z + 30) < 12) continue;
    const emChamas = CASAS_EM_CHAMAS.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 8);
    add(emChamas ? 'cenario/destroyed' : tiposCasa[i % 4], noChao(x, z, -a + Math.PI / 2 + (rnd() - 0.5) * 0.4, S * (0.9 + rnd() * 0.25)));
  }
  CASAS_EM_CHAMAS.forEach(([x, z]) => add('cenario/destroyed', noChao(x, z, rnd() * 6, S)));
  // objetos da vila
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, d = 6 + rnd() * 40, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!livre(x, z, 3)) continue;
    add(['natureza/barrel', 'natureza/crate_A_big', 'natureza/sack', 'natureza/crate_B_small', 'natureza/wheelbarrow', 'natureza/bucket_water'][i % 6], noChao(x, z, rnd() * 6, ESCALA.objeto, 0));
  }
  // cercas de madeira na estrada de entrada
  for (let z = 50; z < 110; z += 6.5) { const x = Math.sin(z * 0.025) * 18 + 6; add('natureza/fence_wood_straight', noChao(x + 1.5, z, 0, ESCALA.objeto * 1.2, 0)); add('natureza/fence_wood_straight', noChao(x + 12, z, 0, ESCALA.objeto * 1.2, 0)); }

  // Fazenda e moinhos
  add('cenario/windmill_red', noChao(-62, 44, 0.6, S * 1.3));
  add('cenario/grain', noChao(-48, 58, 0, S)); add('cenario/grain', noChao(-60, 66, 0.2, S)); add('cenario/grain', noChao(-74, 56, -0.1, S));
  add('cenario/home_B_red', noChao(-78, 38, 0.9, S));
  add('cenario/watermill_red', noChao(57, 32, -Math.PI / 2, S * 1.2));
  add('cenario/lumbermill_red', noChao(-30, 92, 0.3, S));
  add('cenario/mine_red', noChao(105, -110, -0.8, S * 1.4));
  add('cenario/castle_blue', noChao(10, -150, 0, S * 2.4));              // sede do Conselho de Ferro ao longe
  add('cenario/tower_B_red', noChao(40, -125, 0.4, S * 1.2));
  add('cenario/barracks_blue', noChao(-15, -128, 0.2, S * 1.1));

  // Refúgio do Clã: muralha em anel, quartel, tendas, armas, bandeiras
  const [rx, rz] = REFUGIO;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, x = rx + Math.cos(a) * 19, z = rz + Math.sin(a) * 19;
    add(i === 4 ? 'natureza/wall_straight_gate' : 'natureza/wall_straight', noChao(x, z, -a + Math.PI / 2, S * 1.25, 0.3));
  }
  add('cenario/barracks_blue', noChao(rx, rz - 8, 0, S));
  add('cenario/tower_A_red', noChao(rx - 12, rz + 6, 0, S * 0.9));
  add('cenario/blacksmith_red', noChao(rx + 10, rz - 2, -Math.PI / 2, S * 0.9));
  for (let i = 0; i < 6; i++) add('natureza/tent', noChao(rx - 8 + (i % 3) * 7, rz + 6 + Math.floor(i / 3) * 6, rnd() * 6, ESCALA.objeto * 1.4, 0));
  for (let i = 0; i < 4; i++) add('natureza/weaponrack', noChao(rx + 4 + i * 1.8, rz + 3, 0, ESCALA.objeto * 1.3, 0));
  for (let i = 0; i < 4; i++) add('natureza/flag_blue', noChao(rx + Math.cos(i * 1.57 + 0.78) * 15, rz + Math.sin(i * 1.57 + 0.78) * 15, 0, ESCALA.objeto * 3, 0));
  add('natureza/resource_lumber', noChao(rx + 6, rz + 10, 0.5, ESCALA.objeto, 0));

  // Floresta
  const arvores = ['natureza/trees_A_large', 'natureza/trees_B_large', 'natureza/trees_A_medium', 'natureza/trees_B_medium'];
  for (let i = 0; i < 420; i++) {
    const x = (rnd() - 0.5) * 360, z = (rnd() - 0.5) * 360, d = Math.hypot(x, z);
    if (d < 58 || d > 175 || !livre(x, z, 6) || Math.hypot(x - rx, z - rz) < 28 || (x < -40 && x > -90 && z > 30 && z < 75)) continue;
    add(arvores[i % 4], noChao(x, z, rnd() * 6, ESCALA.arvore * (0.8 + rnd() * 0.5), 0.3));
  }
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = 18 + rnd() * 45, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!livre(x, z, 5)) continue;
    add(i % 2 ? 'natureza/tree_single_A' : 'natureza/tree_single_B', noChao(x, z, rnd() * 6, ESCALA.arvore * (0.8 + rnd() * 0.4), 0.2));
  }
  // Pedras
  const pedras = ['natureza/rock_single_A', 'natureza/rock_single_B', 'natureza/rock_single_C', 'natureza/rock_single_D', 'natureza/rock_single_E'];
  for (let i = 0; i < 160; i++) {
    const x = (rnd() - 0.5) * 340, z = (rnd() - 0.5) * 340;
    if (Math.hypot(x, z) < 16 || !livre(x, z, 2)) continue;
    add(pedras[i % 5], noChao(x, z, rnd() * 6, ESCALA.pedra * (0.6 + rnd() * 1.4), 0.1));
  }
  // Montanhas em volta
  const mont = ['natureza/mountain_A_grass_trees', 'natureza/mountain_B_grass_trees', 'natureza/mountain_C_grass', 'natureza/hills_A_trees', 'natureza/hills_B_trees'];
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rnd() * 0.1, d = 182 + rnd() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d;
    add(mont[i % 5], { p: [x, altura(x, z) - 2, z], r: rnd() * 6, s: ESCALA.montanha * (0.85 + rnd() * 0.5) });
  }
  return L;
}

// ---------- Fogo (Capítulo 1: a aldeia em chamas) ----------
function Fogo({ pos }: { pos: [number, number, number] }) {
  const luz = useRef<THREE.PointLight>(null);
  const chamas = useRef<THREE.Group>(null);
  const fase = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + fase;
    if (luz.current) luz.current.intensity = 60 + Math.sin(t * 13) * 15 + Math.sin(t * 7.3) * 10;
    chamas.current?.children.forEach((c, i) => {
      const k = (t * 1.6 + i * 0.37) % 1;                      // sobe e some
      c.position.set(Math.sin(i * 2.1 + t) * 1.4, 1 + k * 6, Math.cos(i * 1.7 + t) * 1.4);
      c.scale.setScalar((1 - k) * (1.6 + (i % 3) * 0.5));
    });
  });
  return (
    <group position={pos}>
      <pointLight ref={luz} color="#ff7a2a" distance={30} decay={1.6} intensity={60} position={[0, 3, 0]} />
      <group ref={chamas}>
        {Array.from({ length: 14 }).map((_, i) => (
          <mesh key={i}>
            <icosahedronGeometry args={[0.6, 0]} />
            <meshBasicMaterial color={i % 3 === 0 ? '#ffd36b' : i % 3 === 1 ? '#ff8a2a' : '#e8461f'} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* fumaça */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`f${i}`} position={[Math.sin(i) * 1.5, 8 + i * 2.5, Math.cos(i) * 1.5]}>
          <sphereGeometry args={[1.6 + i * 0.6, 8, 8]} />
          <meshStandardMaterial color="#3a3530" transparent opacity={0.28 - i * 0.04} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Nuvens ----------
function Nuvens() {
  const g = useRef<THREE.Group>(null);
  const lista = useMemo(() => { const rnd = semente(42); return Array.from({ length: 22 }, () => ({ x: (rnd() - 0.5) * 380, z: (rnd() - 0.5) * 380, y: 55 + rnd() * 25, s: 6 + rnd() * 8, big: rnd() > 0.5 })); }, []);
  useFrame((_, dt) => { if (g.current) { g.current.position.x += dt * 1.2; if (g.current.position.x > 120) g.current.position.x = -120; } });
  return (
    <group ref={g}>
      <Instancias arquivo="natureza/cloud_big" lista={lista.filter((n) => n.big).map((n) => ({ p: [n.x, n.y, n.z], r: n.x, s: n.s }))} sombra={false} />
      <Instancias arquivo="natureza/cloud_small" lista={lista.filter((n) => !n.big).map((n) => ({ p: [n.x, n.y, n.z], r: n.z, s: n.s }))} sombra={false} />
    </group>
  );
}

export function Cenario() {
  const layout = useMemo(gerarLayout, []);
  const capitulo = useJogo((s) => s.progresso?.capitulo ?? 1);
  const qualidade = useJogo((s) => s.config.qualidade);
  const sombraArvores = PRESETS[qualidade].sombra >= 2048;   // árvores com sombra só no Alto/Ultra
  return (
    <>
      {Object.entries(layout).map(([arq, lista]) => (
        <Instancias key={arq} arquivo={arq} lista={lista} sombra={!arq.includes('trees') && !arq.includes('mountain') && !arq.includes('hills') ? true : sombraArvores} />
      ))}
      {capitulo <= 1 && CASAS_EM_CHAMAS.map(([x, z], i) => <Fogo key={i} pos={[x, altura(x, z), z]} />)}
      {/* fogueira no Refúgio */}
      <Fogo pos={[REFUGIO[0] + 2, altura(REFUGIO[0] + 2, REFUGIO[1] + 2), REFUGIO[1] + 2]} />
      <Nuvens />
    </>
  );
}

// pré-carrega tudo que o cenário usa
Object.keys(gerarLayout()).forEach((k) => useGLTF.preload(modelo(k)));
useGLTF.preload(modelo('natureza/cloud_big')); useGLTF.preload(modelo('natureza/cloud_small'));
