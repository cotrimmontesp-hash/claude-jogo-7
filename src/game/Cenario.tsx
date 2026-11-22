// Cenário: aldeia, fazenda, Refúgio do Clã, floresta, pedras, montanhas, nuvens e fogo.
// Objetos repetidos usam "instancing" (uma só chamada de desenho por tipo) para rodar bem no celular.
import React, { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { useGLTF } from './drei';
import { modelo, ESCALA } from './modelos';
import { altura, distEstrada, distRio } from './Terreno';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';
import { aplicarVento } from './Efeitos';
import { Floresta } from './Arvores';
import { Casas, type CasaPos, type TipoCasa } from './Casas';
import { registrarCasas } from './Interiores';
import { ILHAS, LUGAR } from './mapa';

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
const livre = (x: number, z: number, folga: number) => distEstrada(x, z) > folga && distRio(x, z) > folga + 4 && Math.hypot(x - LUGAR.fortaleza[0], z - LUGAR.fortaleza[1]) > 52;

export const REFUGIO: [number, number] = [ILHAS[1].centro[0], ILHAS[1].centro[1]];   // base do seu clã (ilha própria)
const [AX, AZ] = LUGAR.aldeia;
export const CASAS_EM_CHAMAS: [number, number][] = [[AX + 6, AZ - 4], [AX - 12, AZ + 8], [AX + 14, AZ + 14], [AX - 4, AZ + 22]];

// posições com distância mínima entre si (casas mais espaçadas)
function espalhar(rnd: () => number, n: number, gerar: () => [number, number], ok: (x: number, z: number) => boolean, minDist: number, ocupados: [number, number][]) {
  const out: [number, number][] = [];
  for (let t = 0; t < n * 30 && out.length < n; t++) {
    const [x, z] = gerar();
    if (!ok(x, z) || ocupados.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < minDist)) continue;
    out.push([x, z]); ocupados.push([x, z]);
  }
  return out;
}

export const CAIS = ILHAS.map((i) => ({ ilha: i.id, nome: i.nome, pos: i.cais }));

function gerarLayout() {
  const rnd = semente(1789);
  const L: Record<string, Transf[]> = {};
  const add = (k: string, t: Transf) => (L[k] ??= []).push(t);
  const S = ESCALA.cenario;
  const ocupados: [number, number][] = [];
  const marca = (x: number, z: number) => ocupados.push([x, z]);

  // ===== Vila Rica: praça calçada com poço, igreja ao norte, venda, oficina e casas espaçadas =====
  add('cenario/well_red', noChao(0, 0, 0, S)); marca(0, 0);
  add('cenario/church_red', noChao(0, -42, 0, S * 1.25)); marca(0, -42); marca(0, -34);
  add('cenario/tavern_red', noChao(-30, -6, Math.PI / 2, S)); marca(-30, -6);
  add('cenario/blacksmith_red', noChao(30, -4, -Math.PI / 2, S)); marca(30, -4);
  add('cenario/market_yellow', noChao(-8, 30, Math.PI, S)); marca(-8, 30);
  add('cenario/market_yellow', noChao(-34, 30, Math.PI, S)); marca(-34, 30);
  const tiposCasa = ['cenario/home_A_red', 'cenario/home_B_red', 'cenario/home_A_yellow', 'cenario/home_B_blue'];
  const casas = espalhar(rnd, 30, () => { const a = rnd() * Math.PI * 2, d = 32 + rnd() * 70; return [Math.cos(a) * d, Math.sin(a) * d]; },
    (x, z) => livre(x, z, 11) && altura(x, z) > 1, 23, ocupados);
  casas.forEach(([x, z], i) => add(tiposCasa[i % 4], noChao(x, z, 0, S)));
  // objetos da vila (barris, caixotes, carrinhos)
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, d = 8 + rnd() * 95, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!livre(x, z, 3) || ocupados.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 6)) continue;
    add(['natureza/barrel', 'natureza/crate_A_big', 'natureza/sack', 'natureza/crate_B_small', 'natureza/wheelbarrow', 'natureza/bucket_water'][i % 6], noChao(x, z, rnd() * 6, ESCALA.objeto, 0));
  }
  // cercas na estrada de entrada (sul)
  for (let z = 110; z < 200; z += 6.5) { const x = Math.sin(z * 0.025) * 18 + 6; add('natureza/fence_wood_straight', noChao(x - 4, z, 0, ESCALA.objeto * 1.2, 0)); add('natureza/fence_wood_straight', noChao(x + 16, z, 0, ESCALA.objeto * 1.2, 0)); }

  // ===== Aldeia de Inês (queimada no Capítulo 1) =====
  CASAS_EM_CHAMAS.forEach(([x, z]) => { add('cenario/destroyed', noChao(x, z, rnd() * 6, S)); marca(x, z); });
  espalhar(rnd, 3, () => [AX + (rnd() - 0.5) * 50, AZ + (rnd() - 0.5) * 50], (x, z) => livre(x, z, 6) && altura(x, z) > 1, 15, ocupados)
    .forEach(([x, z]) => add('cenario/home_A_yellow', noChao(x, z, 0, S)));

  // ===== Fazenda, moinhos, serraria =====
  const [FX, FZ] = LUGAR.fazenda;
  add('cenario/windmill_red', noChao(FX, FZ, 0.6, S * 1.3)); marca(FX, FZ);
  add('cenario/home_B_red', noChao(FX - 18, FZ - 8, 0.9, S)); marca(FX - 18, FZ - 8);
  add('cenario/watermill_red', noChao(LUGAR.rio[0] - 14, LUGAR.rio[1] - 30, -Math.PI / 2, S * 1.2));
  add('cenario/lumbermill_red', noChao(-60, 150, 0.3, S)); marca(-60, 150);

  // ===== Serra: mosteiro da Irmandade da Lanterna =====
  const [MX, MZ] = LUGAR.mosteiro;
  add('cenario/tower_B_red', noChao(MX, MZ, 0, S * 1.3)); add('cenario/tower_A_red', noChao(MX + 12, MZ + 6, 0, S));
  add('cenario/barracks_blue', noChao(MX - 12, MZ + 4, 0.3, S)); marca(MX, MZ);
  for (let i = 0; i < 4; i++) add('natureza/flag_blue', noChao(MX - 8 + i * 6, MZ + 14, 0, ESCALA.objeto * 3, 0));

  // ===== Minas e quartel do Conselho na ilha principal =====
  add('cenario/mine_red', noChao(LUGAR.minas[0], LUGAR.minas[1], -0.8, S * 1.5)); marca(LUGAR.minas[0], LUGAR.minas[1]);
  add('cenario/tower_A_red', noChao(LUGAR.minas[0] - 20, LUGAR.minas[1] + 12, 0, S));
  add('cenario/barracks_blue', noChao(LUGAR.quartel[0], LUGAR.quartel[1], 0.2, S * 1.1)); marca(LUGAR.quartel[0], LUGAR.quartel[1]);
  for (let i = 0; i < 3; i++) add('natureza/flag_red', noChao(LUGAR.quartel[0] - 8 + i * 8, LUGAR.quartel[1] + 10, 0, ESCALA.objeto * 3, 0));

  // ===== Cais com barcos em todas as ilhas =====
  for (const c of CAIS) {
    const [x, z] = c.pos, ilha = ILHAS.find((i) => i.id === c.ilha)!;
    const ang = Math.atan2(x - ilha.centro[0], z - ilha.centro[1]);
    for (let k = 0; k < 4; k++) add('natureza/pallet', { p: [x + Math.sin(ang) * k * 1.6, 0.1, z + Math.cos(ang) * k * 1.6], r: ang, s: ESCALA.objeto * 2.2 });
    add('natureza/barrel', noChao(x - Math.cos(ang) * 3, z + Math.sin(ang) * 3, 0, ESCALA.objeto, 0));
    marca(x, z);
  }

  // ===== Ilha do seu clã: Refúgio da Lanterna =====
  const [rx, rz] = REFUGIO;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2, x = rx + Math.cos(a) * 26, z = rz + Math.sin(a) * 26;
    add(i === 2 ? 'natureza/wall_straight_gate' : 'natureza/wall_straight', noChao(x, z, -a + Math.PI / 2, S * 1.35, 0.3));
  }
  add('casa/principal', noChao(rx, rz - 13, 0, S)); add('cenario/tower_A_red', noChao(rx - 15, rz + 8, 0, S * 0.9));   // Casa Grande do seu clã
  add('cenario/tower_A_red', noChao(rx + 15, rz + 8, 0, S * 0.9)); add('cenario/blacksmith_red', noChao(rx + 12, rz - 4, -Math.PI / 2, S * 0.9));
  for (let i = 0; i < 6; i++) add('natureza/tent', noChao(rx - 9 + (i % 3) * 8, rz + 8 + Math.floor(i / 3) * 7, rnd() * 6, ESCALA.objeto * 1.4, 0));
  for (let i = 0; i < 4; i++) add('natureza/weaponrack', noChao(rx + 3 + i * 1.8, rz + 3, 0, ESCALA.objeto * 1.3, 0));
  for (let i = 0; i < 6; i++) add('natureza/flag_blue', noChao(rx + Math.cos(i * 1.05) * 22, rz + Math.sin(i * 1.05) * 22, 0, ESCALA.objeto * 3, 0));
  marca(rx, rz);

  // ===== Ilhas inimigas: fortes dos outros clãs =====
  for (const ilha of ILHAS.filter((i) => i.dono === 'conselho' || i.dono === 'rival')) {
    const [cx, cz] = ilha.centro, conselho = ilha.dono === 'conselho', flag = conselho ? 'natureza/flag_red' : 'natureza/flag_blue';
    if (conselho) add('cenario/castle_blue', noChao(cx, cz, 0, S * 2.6));
    else { add('cenario/tower_B_red', noChao(cx, cz, 0, S * 1.4)); add('cenario/barracks_blue', noChao(cx + 18, cz + 2, 0.4, S)); }
    add('casa/principal', noChao(cx, cz - 22, 0, S));                     // Casa Grande do clã rival
    add('cenario/tower_A_red', noChao(cx - 20, cz + 14, 0, S)); add('cenario/tower_A_red', noChao(cx + 20, cz + 14, 0, S));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, x = cx + Math.cos(a) * 36, z = cz + Math.sin(a) * 36;
      add(i === 6 ? 'natureza/wall_straight_gate' : 'natureza/wall_straight', noChao(x, z, -a + Math.PI / 2, S * 1.4, 0.3));
    }
    for (let i = 0; i < 6; i++) add(flag, noChao(cx + Math.cos(i * 1.05 + 0.5) * 30, cz + Math.sin(i * 1.05 + 0.5) * 30, 0, ESCALA.objeto * 3.2, 0));
    for (let i = 0; i < 5; i++) add('natureza/tent', noChao(cx - 12 + i * 6, cz + 24, rnd() * 6, ESCALA.objeto * 1.4, 0));
    marca(cx, cz);
  }

  // ===== Floresta (árvores realistas) =====
  const arvores = ['natureza/trees_A_large', 'natureza/trees_B_large', 'natureza/trees_A_medium', 'natureza/trees_B_medium'];
  for (let i = 0; i < 900; i++) {
    const ilhaIdx = i < 760 ? 0 : 1 + (i % 4);
    const il = ILHAS[ilhaIdx], a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * il.raio * 0.85;
    const x = il.centro[0] + Math.cos(a) * d, z = il.centro[1] + Math.sin(a) * d, h = altura(x, z);
    if (h < 1.5 || h > 34 || !livre(x, z, 6) || ocupados.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < (ilhaIdx ? 42 : 16))) continue;
    if (ilhaIdx === 0 && Math.hypot(x, z) < 110) continue;                        // sem bosque dentro da vila
    add(arvores[i % 4], noChao(x, z, rnd() * 6, ESCALA.arvore * (0.8 + rnd() * 0.5), 0.3));
  }
  for (let i = 0; i < 90; i++) {                                                   // árvores soltas na vila e na aldeia
    const a = rnd() * Math.PI * 2, d = 25 + rnd() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!livre(x, z, 5) || ocupados.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 9)) continue;
    add(i % 2 ? 'natureza/tree_single_A' : 'natureza/tree_single_B', noChao(x, z, rnd() * 6, ESCALA.arvore * (0.8 + rnd() * 0.4), 0.2));
  }
  // ===== Pedras =====
  const pedras = ['natureza/rock_single_A', 'natureza/rock_single_B', 'natureza/rock_single_C', 'natureza/rock_single_D', 'natureza/rock_single_E'];
  for (let i = 0; i < 320; i++) {
    const x = (rnd() - 0.5) * 560, z = (rnd() - 0.5) * 560, h = altura(x, z);
    if (Math.hypot(x, z) < 25 || h < 0.8 || !livre(x, z, 2)) continue;
    add(pedras[i % 5], noChao(x, z, rnd() * 6, ESCALA.pedra * (0.6 + rnd() * (h > 15 ? 3 : 1.4)), 0.1));
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

const EH_ARVORE = /natureza\/(trees_|tree_single)/;

// Construções do pacote estilizado que viram casas coloniais realistas
const CASA_DE: Record<string, TipoCasa> = {
  'cenario/home_A_red': 'terrea', 'cenario/home_A_yellow': 'terrea', 'cenario/home_B_red': 'sobrado', 'cenario/home_B_blue': 'sobrado',
  'cenario/tavern_red': 'venda', 'cenario/market_yellow': 'venda', 'cenario/blacksmith_red': 'oficina', 'cenario/church_red': 'igreja', 'cenario/destroyed': 'ruina', 'casa/principal': 'principal',
};
function casasRealistas(L: Record<string, Transf[]>): CasaPos[] {
  const out: CasaPos[] = [];
  for (const [k, lista] of Object.entries(L)) {
    const tipo = CASA_DE[k]; if (!tipo) continue;
    for (const t of lista) {
      const [x, , z] = t.p, d = Math.hypot(x, z);
      // na vila a fachada olha para a praça; fora dela mantém a direção original
      const naAldeia = Math.hypot(x - LUGAR.aldeia[0], z - LUGAR.aldeia[1]) < 45;
      const r = naAldeia ? Math.atan2(LUGAR.aldeia[0] - x, LUGAR.aldeia[1] - z) : d < 130 ? Math.atan2(-x, -z) : t.r;
      const y = Math.min(altura(x, z), altura(x + 3, z + 3), altura(x - 3, z - 3)) - 0.25;
      out.push({ tipo, p: [x, y, z], r, s: tipo === 'igreja' || tipo === 'principal' ? 1 : 0.92 + ((Math.abs(x * 13 + z * 7) | 0) % 10) / 60 });
    }
  }
  return out;
}

// As árvores do pacote estilizado viram árvores realistas geradas pelo jogo (cada "bosque" vira 2–3 árvores)
function arvoresRealistas(L: Record<string, Transf[]>) {
  const rnd = semente(4242); const out: Transf[] = [];
  for (const [k, lista] of Object.entries(L)) {
    if (!EH_ARVORE.test(k)) continue;
    const bosque = /trees_/.test(k);
    for (const t of lista) {
      const n = bosque ? 2 + Math.floor(rnd() * 2) : 1;
      for (let i = 0; i < n; i++) {
        const x = t.p[0] + (bosque ? (rnd() - 0.5) * 9 : 0), z = t.p[2] + (bosque ? (rnd() - 0.5) * 9 : 0);
        out.push({ p: [x, altura(x, z) - 0.2, z], r: rnd() * 6.28, s: (t.s / ESCALA.arvore) * (0.75 + rnd() * 0.5) });
      }
    }
  }
  return out;
}

export function Cenario() {
  const layout = useMemo(gerarLayout, []);
  const arvores = useMemo(() => arvoresRealistas(layout), [layout]);
  const casas = useMemo(() => { const c = casasRealistas(layout); registrarCasas(c); return c; }, [layout]);
  const capitulo = useJogo((s) => s.progresso?.capitulo ?? 1);
  const qualidade = useJogo((s) => s.config.qualidade);
  const sombraArvores = PRESETS[qualidade].sombra >= 2048;   // árvores com sombra só no Alto/Ultra
  return (
    <>
      <Suspense fallback={null}><Floresta lista={arvores} sombra={sombraArvores} densidade={qualidade === 'baixo' ? 0.45 : qualidade === 'medio' ? 0.75 : 1} /></Suspense>
      <Suspense fallback={null}><Casas lista={casas} /></Suspense>
      {Object.entries(layout).filter(([arq]) => !EH_ARVORE.test(arq) && !CASA_DE[arq]).map(([arq, lista]) => (
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
