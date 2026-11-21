// Casas por dentro + paredes sólidas.
// Cada casa tem porta: chegando perto e apertando USAR você entra num cômodo mobiliado (cama, mesa, lareira, baú...).
// As paredes do cômodo só aparecem por dentro, então a câmera vê o interior mesmo estando "atrás" da parede.
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { create } from 'zustand';
import { useFrame } from './r3f';
import { useTexture } from './drei';
import { entrada } from './input';
import { textura } from './modelos';
import type { CasaPos, TipoCasa } from './Casas';
import { jogadorPos, jogadorRot } from './Mundo';
import { pedidoTeleporte } from './teleporte';
import { altura } from './Terreno';
import { useJogo } from '../state/store';
import type { Material } from '../data/items';
import { tocar } from './som';

// ---------- dados das casas do mundo (preenchidos pelo Cenário) ----------
export const casasMundo: CasaPos[] = [];
export function registrarCasas(l: CasaPos[]) { casasMundo.length = 0; casasMundo.push(...l); }

const PLANTA: Record<TipoCasa, { W: number; D: number; porta: number }> = {
  terrea: { W: 7, D: 5.5, porta: -7 * 0.18 }, sobrado: { W: 8, D: 6.5, porta: 0 }, venda: { W: 9, D: 7, porta: 0 },
  oficina: { W: 8, D: 6, porta: -8 * 0.18 }, ruina: { W: 7, D: 5.5, porta: 0 }, igreja: { W: 10, D: 17, porta: 0 },
};
const paraLocal = (c: CasaPos, x: number, z: number) => {
  const dx = x - c.p[0], dz = z - c.p[2], co = Math.cos(c.r), si = Math.sin(c.r);
  return [dx * co - dz * si, dx * si + dz * co] as const;
};
const paraMundo = (c: CasaPos, lx: number, lz: number) => {
  const co = Math.cos(c.r), si = Math.sin(c.r);
  return [c.p[0] + lx * co + lz * si, c.p[2] - lx * si + lz * co] as const;
};
export function portaDe(c: CasaPos, fora = 1.3) {
  const pl = PLANTA[c.tipo]; return paraMundo(c, pl.porta * c.s, (pl.D / 2) * c.s + fora);
}

/** Empurra o jogador para fora das paredes das casas (não atravessa mais). */
export function colidirCasas(pos: THREE.Vector3) {
  for (const c of casasMundo) {
    if (c.tipo === 'ruina') continue;
    const dx = pos.x - c.p[0], dz = pos.z - c.p[2]; if (dx * dx + dz * dz > 400) continue;
    const pl = PLANTA[c.tipo]; const hw = (pl.W / 2) * c.s + 0.4, hd = (pl.D / 2) * c.s + 0.4;
    const [lx, lz] = paraLocal(c, pos.x, pos.z);
    if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
      const px = hw - Math.abs(lx), pz = hd - Math.abs(lz);
      const nx = px < pz ? Math.sign(lx) * hw : lx, nz = px < pz ? lz : Math.sign(lz) * hd;
      const [wx, wz] = paraMundo(c, nx, nz); pos.x = wx; pos.z = wz;
    }
  }
}

// ---------- estado: dentro de qual casa ----------
export const INTERIOR = { x: -560, y: 60, z: 0 };             // os cômodos ficam num canto vazio do mar
const SALA: Record<TipoCasa, { W: number; D: number; H: number }> = {
  terrea: { W: 10, D: 8, H: 3.6 }, sobrado: { W: 12, D: 9, H: 4.2 }, venda: { W: 12, D: 9, H: 4 },
  oficina: { W: 11, D: 9, H: 4 }, ruina: { W: 10, D: 8, H: 3.6 }, igreja: { W: 12, D: 24, H: 9 },
};
interface EstadoInterior { casa: number | null; dica: string; set: (p: Partial<EstadoInterior>) => void }
export const useInterior = create<EstadoInterior>((set) => ({ casa: null, dica: '', set: (p) => set(p) }));
export const dentroDeCasa = () => useInterior.getState().casa !== null;
/** Limites do cômodo (o jogador não sai pelas paredes). */
export function limitarInterior(pos: THREE.Vector3) {
  const i = useInterior.getState().casa; if (i === null) return;
  const s = SALA[casasMundo[i]?.tipo ?? 'terrea'];
  pos.x = THREE.MathUtils.clamp(pos.x, INTERIOR.x - s.W / 2 + 0.5, INTERIOR.x + s.W / 2 - 0.5);
  pos.z = THREE.MathUtils.clamp(pos.z, INTERIOR.z - s.D / 2 + 0.5, INTERIOR.z + s.D / 2 - 0.5);
}
/** Posição segura para salvar (se estiver dentro de casa, salva na porta). */
export function posicaoParaSalvar(): [number, number, number] {
  const i = useInterior.getState().casa;
  if (i === null || !casasMundo[i]) return jogadorPos.toArray() as [number, number, number];
  const [x, z] = portaDe(casasMundo[i]); return [x, altura(x, z), z];
}

function entrar(i: number) {
  const s = SALA[casasMundo[i].tipo];
  pedidoTeleporte.alvo = new THREE.Vector3(INTERIOR.x, INTERIOR.y, INTERIOR.z + s.D / 2 - 1.4);
  jogadorRot.y = Math.PI;
  useInterior.setState({ casa: i, dica: '' }); tocar('passo');
}
function sair() {
  const i = useInterior.getState().casa; if (i === null) return;
  const c = casasMundo[i]; const [x, z] = portaDe(c, 1.8);
  pedidoTeleporte.alvo = new THREE.Vector3(x, altura(x, z), z);
  useInterior.setState({ casa: null, dica: '' }); tocar('passo');
}

// itens que se usam dentro de casa
type Uso = 'sair' | 'bau' | 'comer' | 'dormir' | 'forja' | 'rezar';
interface Ponto { uso: Uso; p: [number, number]; texto: string }
function pontosDa(tipo: TipoCasa): Ponto[] {
  const s = SALA[tipo]; const sair: Ponto = { uso: 'sair', p: [0, s.D / 2 - 0.6], texto: '🚪 USAR: sair' };
  if (tipo === 'igreja') return [sair, { uso: 'rezar', p: [0, -s.D / 2 + 2.5], texto: '🙏 USAR: rezar no altar (recupera toda a vida)' }];
  const base: Ponto[] = [sair, { uso: 'bau', p: [s.W / 2 - 1.2, -s.D / 2 + 1.2], texto: '🧰 USAR: abrir o baú' }, { uso: 'comer', p: [0, 0], texto: '🍞 USAR: comer e beber na mesa' }];
  if (tipo === 'oficina') base.push({ uso: 'forja', p: [-s.W / 2 + 1.6, -s.D / 2 + 1.6], texto: '⚒ USAR: bigorna (melhorar arma e armadura)' });
  else base.push({ uso: 'dormir', p: [-s.W / 2 + 1.4, -s.D / 2 + 1.6], texto: '🛏 USAR: dormir até de manhã' });
  return base;
}

function usar(uso: Uso, casa: number) {
  const { atualizar, irPara } = useJogo.getState();
  if (uso === 'sair') return sair();
  if (uso === 'comer') { atualizar((p) => ({ fome: Math.min(100, p.fome + 35), sede: Math.min(100, p.sede + 45) })); useInterior.setState({ dica: '😋 Você comeu e bebeu.' }); return; }
  if (uso === 'dormir') { atualizar((p) => ({ horaDoDia: 6.5, energia: 100, vida: Math.min(100, p.vida + 40), diasSobrevividos: p.diasSobrevividos + (p.horaDoDia > 6.5 ? 1 : 0) })); useInterior.setState({ dica: '🌅 Você dormiu. Já é de manhã!' }); return; }
  if (uso === 'rezar') { atualizar(() => ({ vida: 100, energia: 100 })); useInterior.setState({ dica: '✨ Você se sente renovado.' }); return; }
  if (uso === 'forja') { irPara('forja'); return; }
  if (uso === 'bau') {
    const chave = `bau_${casa}`; const p = useJogo.getState().progresso;
    if (p?.escolhas[chave]) { useInterior.setState({ dica: 'O baú está vazio.' }); return; }
    const opcoes: Material[] = ['madeira', 'ferro', 'couro', 'osso', 'ouro', 'pena'];
    const ganhos: Partial<Record<Material, number>> = {};
    for (let k = 0; k < 2; k++) { const m = opcoes[(casa * 7 + k * 3) % opcoes.length]; ganhos[m] = (ganhos[m] ?? 0) + 1 + ((casa + k) % 3); }
    atualizar((q) => { const mm = { ...q.materiais }; for (const [k, v] of Object.entries(ganhos)) mm[k as Material] = (mm[k as Material] ?? 0) + (v ?? 0); return { materiais: mm, escolhas: { ...q.escolhas, [chave]: 'aberto' } }; });
    useInterior.setState({ dica: '🧰 Achou: ' + Object.entries(ganhos).map(([k, v]) => `${v} ${k}`).join(', ') });
  }
}

/** Lógica de entrar/sair/usar e as dicas na tela. */
export function LogicaCasas() {
  const apertou = useRef(false), t = useRef(0);
  useFrame((_, dt) => {
    const clique = entrada.interagir && !apertou.current; apertou.current = entrada.interagir;
    t.current += dt; if (!clique && t.current < 0.2) return; t.current = 0;
    const { casa, dica } = useInterior.getState();
    if (casa === null) {
      let perto = -1;
      for (let i = 0; i < casasMundo.length; i++) {
        const c = casasMundo[i]; if (c.tipo === 'ruina') continue;
        const [px, pz] = portaDe(c); if (Math.hypot(px - jogadorPos.x, pz - jogadorPos.z) < 2.4) { perto = i; break; }
      }
      if (perto >= 0 && clique) return entrar(perto);
      const nova = perto >= 0 ? (casasMundo[perto].tipo === 'igreja' ? '⛪ USAR: entrar na igreja' : casasMundo[perto].tipo === 'oficina' ? '⚒ USAR: entrar na oficina do ferreiro' : casasMundo[perto].tipo === 'venda' ? '🍺 USAR: entrar na venda' : '🚪 USAR: entrar na casa') : '';
      if (nova !== dica && (!dica || !dica.startsWith('🌅'))) useInterior.setState({ dica: nova });
      return;
    }
    const pts = pontosDa(casasMundo[casa].tipo);
    let melhor: Ponto | null = null, md = 2.2;
    for (const pt of pts) { const d = Math.hypot(INTERIOR.x + pt.p[0] - jogadorPos.x, INTERIOR.z + pt.p[1] - jogadorPos.z); if (d < md) { md = d; melhor = pt; } }
    if (melhor && clique) return usar(melhor.uso, casa);
    const nova = melhor?.texto ?? '';
    const fixa = /^(😋|🌅|✨|🧰 Achou|O baú)/.test(dica);
    if (!fixa && nova !== dica) useInterior.setState({ dica: nova });
    if (fixa && !melhor) setTimeout(() => useInterior.getState().dica === dica && useInterior.setState({ dica: '' }), 2500);
  });
  return null;
}

// ---------- o cômodo em 3D ----------
const URLS = { parede: textura('casa/parede_cor.jpg'), madeira: textura('casa/madeira_cor.jpg'), madeiraN: textura('casa/madeira_nor.jpg'), pedra: textura('casa/pedra_cor.jpg') };

function Caixa({ p, s, m, r = 0 }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: number }) {
  return <mesh position={p} rotation={[0, r, 0]} material={m} castShadow receiveShadow><boxGeometry args={s} /></mesh>;
}

export function Interior() {
  const casa = useInterior((s) => s.casa);
  const tex = useTexture(URLS) as unknown as Record<string, THREE.Texture>;
  const mats = useMemo(() => {
    const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.colorSpace = THREE.SRGBColorSpace; c.needsUpdate = true; return c; };
    return {
      parede: new THREE.MeshStandardMaterial({ map: rep(tex.parede, 3, 1.5), color: '#f1e6d2', roughness: 0.95, side: THREE.BackSide }),
      chao: new THREE.MeshStandardMaterial({ map: rep(tex.madeira, 4, 4), color: '#b08a63', roughness: 0.8 }),
      pedraChao: new THREE.MeshStandardMaterial({ map: rep(tex.pedra, 4, 8), color: '#bdb3a4', roughness: 0.9 }),
      madeira: new THREE.MeshStandardMaterial({ map: rep(tex.madeira, 1, 1), color: '#7a5634', roughness: 0.75 }),
      escura: new THREE.MeshStandardMaterial({ map: rep(tex.madeira, 1, 1), color: '#4a3220', roughness: 0.8 }),
      pedra: new THREE.MeshStandardMaterial({ map: rep(tex.pedra, 1, 1), color: '#9a9083', roughness: 0.95 }),
      tecido: new THREE.MeshStandardMaterial({ color: '#8c2f2a', roughness: 1 }),
      lencol: new THREE.MeshStandardMaterial({ color: '#e8e0cf', roughness: 1 }),
      fogo: new THREE.MeshBasicMaterial({ color: '#ffb347' }),
      ouro: new THREE.MeshStandardMaterial({ color: '#d4a83a', metalness: 0.9, roughness: 0.3 }),
      ferro: new THREE.MeshStandardMaterial({ color: '#3d3d40', metalness: 0.8, roughness: 0.45 }),
    };
  }, [tex]);
  const chama = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => { if (chama.current) chama.current.intensity = 18 + Math.sin(clock.elapsedTime * 13) * 3 + Math.sin(clock.elapsedTime * 7.3) * 2; });
  if (casa === null || !casasMundo[casa]) return null;
  const tipo = casasMundo[casa].tipo; const { W, D, H } = SALA[tipo];
  const igreja = tipo === 'igreja', oficina = tipo === 'oficina', venda = tipo === 'venda';
  return (
    <group position={[INTERIOR.x, INTERIOR.y, INTERIOR.z]}>
      {/* paredes e teto (só por dentro) */}
      <mesh position={[0, H / 2, 0]} material={mats.parede}><boxGeometry args={[W, H, D]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={igreja ? mats.pedraChao : mats.chao} receiveShadow><planeGeometry args={[W, D]} /></mesh>
      {/* vigas do teto */}
      {Array.from({ length: Math.floor(D / 2.2) }, (_, i) => <Caixa key={i} p={[0, H - 0.15, -D / 2 + 1.1 + i * 2.2]} s={[W, 0.22, 0.25]} m={mats.escura} />)}
      {/* porta */}
      <Caixa p={[0, 1.2, D / 2 - 0.06]} s={[1.4, 2.4, 0.1]} m={mats.escura} />
      <Caixa p={[0.5, 1.15, D / 2 - 0.13]} s={[0.12, 0.12, 0.05]} m={mats.ferro} />
      {/* janelas com luz entrando */}
      {[-W / 4, W / 4].map((x, i) => <mesh key={i} position={[x, H * 0.55, -D / 2 + 0.03]}><planeGeometry args={[1.1, 1.3]} /><meshBasicMaterial color="#cfe6ff" /></mesh>)}
      <hemisphereLight args={['#ffe9c9', '#4a3a2a', 0.6]} />

      {igreja ? <>
        {Array.from({ length: 6 }, (_, i) => [-2.6, 2.6].map((x) => <Caixa key={`${i}${x}`} p={[x, 0.45, -D / 2 + 6 + i * 2.6]} s={[3.6, 0.9, 0.7]} m={mats.madeira} />))}
        <Caixa p={[0, 0.5, -D / 2 + 1.5]} s={[W - 2, 1, 3]} m={mats.pedra} />
        <Caixa p={[0, 1.6, -D / 2 + 1.2]} s={[2.4, 1.2, 1]} m={mats.ouro} />
        <Caixa p={[0, 4, -D / 2 + 0.3]} s={[4, 5, 0.3]} m={mats.ouro} />
        <Caixa p={[0, 4.5, -D / 2 + 0.5]} s={[0.25, 2.6, 0.2]} m={mats.escura} />
        <Caixa p={[0, 5.2, -D / 2 + 0.5]} s={[1.3, 0.25, 0.2]} m={mats.escura} />
        {[-1.6, 1.6].map((x) => <group key={x}><Caixa p={[x, 2.4, -D / 2 + 1.4]} s={[0.12, 0.6, 0.12]} m={mats.lencol} /><pointLight position={[x, 2.9, -D / 2 + 1.4]} color="#ffc070" intensity={6} distance={10} /></group>)}
        <pointLight position={[0, H - 1, 0]} color="#ffe2b0" intensity={20} distance={30} />
      </> : <>
        {/* mesa com pão e jarra */}
        <Caixa p={[0, 0.78, 0]} s={[2.2, 0.1, 1.2]} m={mats.madeira} />
        {[[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].map(([x, z], i) => <Caixa key={i} p={[x, 0.38, z]} s={[0.1, 0.76, 0.1]} m={mats.escura} />)}
        {[-1.5, 1.5].map((x) => <Caixa key={x} p={[x, 0.45, 0]} s={[0.5, 0.08, 0.5]} m={mats.escura} />)}
        <mesh position={[-0.4, 0.9, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#c58a45" roughness={1} /></mesh>
        <mesh position={[0.4, 0.98, 0.1]}><cylinderGeometry args={[0.1, 0.13, 0.32, 10]} /><meshStandardMaterial color="#8a5a3a" roughness={0.7} /></mesh>
        {/* baú */}
        <Caixa p={[W / 2 - 1.2, 0.35, -D / 2 + 0.7]} s={[1.1, 0.7, 0.65]} m={mats.escura} />
        <Caixa p={[W / 2 - 1.2, 0.5, -D / 2 + 1.04]} s={[0.16, 0.18, 0.04]} m={mats.ouro} />
        {/* estante */}
        <Caixa p={[W / 2 - 0.3, 1.3, 0.6]} s={[0.4, 2.6, 1.8]} m={mats.madeira} />
        {[0.6, 1.3, 2].map((y) => <Caixa key={y} p={[W / 2 - 0.45, y, 0.6]} s={[0.2, 0.25, 1.5]} m={mats.tecido} />)}
        {oficina ? <>
          {/* forja e bigorna */}
          <Caixa p={[-W / 2 + 1.2, 0.6, -D / 2 + 0.9]} s={[1.8, 1.2, 1.4]} m={mats.pedra} />
          <mesh position={[-W / 2 + 1.2, 1.25, -D / 2 + 0.9]}><boxGeometry args={[1.2, 0.1, 0.9]} /><primitive object={mats.fogo} attach="material" /></mesh>
          <Caixa p={[-W / 2 + 2.3, 0.4, -D / 2 + 2.3]} s={[0.5, 0.8, 0.5]} m={mats.escura} />
          <Caixa p={[-W / 2 + 2.3, 0.9, -D / 2 + 2.3]} s={[1, 0.25, 0.4]} m={mats.ferro} />
          {[0, 1, 2].map((i) => <Caixa key={i} p={[-W / 2 + 0.08, 1.4 + i * 0.4, 1 + i * 0.5]} s={[0.05, 0.9, 0.12]} m={mats.ferro} r={0.3} />)}
          <pointLight ref={chama} position={[-W / 2 + 1.2, 1.8, -D / 2 + 1]} color="#ff7a2a" distance={12} />
        </> : <>
          {/* cama ou balcão */}
          {venda ? <>
            <Caixa p={[-W / 2 + 2.2, 0.55, -D / 2 + 1.6]} s={[3.6, 1.1, 0.8]} m={mats.madeira} />
            {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-W / 2 + 0.7 + i * 0.9, 0.5, -D / 2 + 0.6]} rotation={[Math.PI / 2, 0, 0]} material={mats.madeira}><cylinderGeometry args={[0.4, 0.4, 0.9, 14]} /></mesh>)}
          </> : <>
            <Caixa p={[-W / 2 + 1.2, 0.3, -D / 2 + 1.3]} s={[1.4, 0.45, 2.2]} m={mats.escura} />
            <Caixa p={[-W / 2 + 1.2, 0.58, -D / 2 + 1.4]} s={[1.3, 0.14, 2]} m={mats.lencol} />
            <Caixa p={[-W / 2 + 1.2, 0.62, -D / 2 + 1.9]} s={[1.32, 0.16, 1.1]} m={mats.tecido} />
            <Caixa p={[-W / 2 + 1.2, 0.72, -D / 2 + 0.55]} s={[0.9, 0.16, 0.4]} m={mats.lencol} />
          </>}
          {/* lareira */}
          <Caixa p={[0, 0.9, -D / 2 + 0.45]} s={[1.9, 1.8, 0.8]} m={mats.pedra} />
          <mesh position={[0, 0.45, -D / 2 + 0.86]}><boxGeometry args={[0.9, 0.6, 0.05]} /><primitive object={mats.fogo} attach="material" /></mesh>
          <Caixa p={[0, H / 2 + 1, -D / 2 + 0.35]} s={[1, H - 1.8, 0.6]} m={mats.pedra} />
          <pointLight ref={chama} position={[0, 0.9, -D / 2 + 1.4]} color="#ff9a40" distance={14} />
        </>}
        {/* tapete */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.6]}><planeGeometry args={[3, 1.6]} /><primitive object={mats.tecido} attach="material" /></mesh>
        <pointLight position={[0, H - 0.6, 0]} color="#ffdcae" intensity={8} distance={16} />
      </>}
    </group>
  );
}
