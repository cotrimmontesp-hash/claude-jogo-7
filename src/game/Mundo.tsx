// Mundo 3D: jogador, câmera (3 modos), animais caçáveis, ciclo dia/noite e sobrevivência.
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from './r3f';
import { Heroi3D } from './Heroi3D';
import { entrada } from './input';
import { useJogo, type ModoCamera } from '../state/store';
import { ANIMAIS, type Animal } from '../data/animals';
import type { Material } from '../data/items';
import { HEROIS } from '../data/characters';
import { enviarEstadoJogador } from '../net/client';
import { MONTARIAS } from '../data/mounts';
import { Graficos } from './Graficos';
import { PRESETS } from './qualidade';
import { Batalha } from './Batalha';
import { verificarInvasao } from './claLogica';

const VEL_ANDAR = 3.2, VEL_CORRER = 6.5, VEL_FURTIVO = 1.6, GRAVIDADE = 22, PULO = 8;
const DURACAO_DIA = 20 * 60; // 20 min reais = 24h no jogo

// ---------- Câmera ----------
function CameraRig({ alvo, modo }: { alvo: React.RefObject<THREE.Group>; modo: ModoCamera }) {
  const { camera } = useThree();
  const yaw = useRef(0), pitch = useRef(0.35);
  useFrame(() => {
    const p = alvo.current?.position; if (!p) return;
    const sens = useJogo.getState().config.sensibilidade;
    yaw.current -= entrada.olhar.dx * 0.004 * sens; pitch.current += entrada.olhar.dy * 0.003 * sens;
    pitch.current = Math.max(-0.2, Math.min(1.2, pitch.current)); entrada.olhar = { dx: 0, dy: 0 };
    const desejo = new THREE.Vector3();
    if (modo === 'terceira') {
      const d = 5.5;
      desejo.set(p.x + Math.sin(yaw.current) * Math.cos(pitch.current) * d, p.y + 1.6 + Math.sin(pitch.current) * d, p.z + Math.cos(yaw.current) * Math.cos(pitch.current) * d);
    } else if (modo === 'cima') {
      desejo.set(p.x, p.y + 14, p.z + 9);            // estilo vista de cima
    } else {
      desejo.set(p.x, p.y + 2.2, p.z + 11);           // lateral 2.5D
    }
    camera.position.lerp(desejo, 0.12);
    camera.lookAt(p.x, p.y + 1.1, p.z);
  });
  return null;
}
export const yawCamera = (camera: THREE.Camera) => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return Math.atan2(d.x, d.z); };

// ---------- Jogador ----------
function Jogador({ onAtacar }: { onAtacar: (pos: THREE.Vector3, alcance: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const velY = useRef(0); const recarga = useRef(0); const envio = useRef(0);
  const { camera } = useThree();
  const progresso = useJogo((s) => s.progresso)!;
  const modo = useJogo((s) => s.config.camera);
  const heroi = HEROIS.find((h) => h.id === progresso.heroi)!;

  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    const { x, y } = entrada.mover;
    let dir = new THREE.Vector3();
    if (modo === 'lateral') dir.set(x, 0, 0);
    else if (modo === 'cima') dir.set(x, 0, -y);
    else { const yaw = yawCamera(camera); const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const r = new THREE.Vector3(-f.z, 0, f.x);
      dir = f.multiplyScalar(y).add(r.multiplyScalar(x)); }
    const montado = useJogo.getState().progresso?.montado;
    const mont = montado ? MONTARIAS.find((m) => m.id === montado) : null;
    const vel = mont
      ? (entrada.correr ? mont.velocidade : mont.velocidade * 0.45)   // galope x trote
      : (entrada.furtivo ? VEL_FURTIVO : entrada.correr ? VEL_CORRER : VEL_ANDAR) * heroi.bonus.agilidade;
    if (dir.lengthSq() > 0.01) {
      g.position.addScaledVector(dir.normalize(), vel * dt);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dir.x, dir.z), 0.2);
    }
    if (modo === 'lateral') g.position.z = 0;
    // pulo e gravidade
    if (entrada.pular && g.position.y <= 0.001) velY.current = PULO;
    velY.current -= GRAVIDADE * dt; g.position.y = Math.max(0, g.position.y + velY.current * dt);
    // ataque
    recarga.current -= dt;
    if (entrada.atacar && recarga.current <= 0) { recarga.current = 0.5; onAtacar(g.position.clone(), 1.8); }
    // online: envia posição ~15x/s
    envio.current += dt;
    if (envio.current > 0.066) { envio.current = 0; enviarEstadoJogador({ p: g.position.toArray(), r: g.rotation.y, anim: entrada.correr ? 'correr' : 'andar' }); }
    jogadorPos.copy(g.position); jogadorRot.copy(g.rotation);
    // montado: herói sobe para a sela
    g.children.forEach((c) => (c.position.y = c.userData.y0 ??= c.position.y));
    if (mont) g.children.forEach((c) => (c.position.y = c.userData.y0 + 1.0));
  });

  return (
    <>
      <Heroi3D ref={ref} heroi={progresso.heroi} posicao={progresso.posicao} />
      <CameraRig alvo={ref} modo={modo} />
    </>
  );
}
export const jogadorPos = new THREE.Vector3();

// ---------- Montarias ----------
// Cavalos selvagens, mulas e bois espalhados no mapa. Chegue perto e aperte ✋ (E) para montar/domar; de novo para descer.
const SPAWN_MONTARIAS: { id: string; pos: [number, number, number] }[] = [
  { id: 'cavalo_selvagem', pos: [12, 0, -8] }, { id: 'cavalo_selvagem', pos: [-20, 0, 18] },
  { id: 'mula', pos: [6, 0, 14] }, { id: 'jumento', pos: [-10, 0, -15] }, { id: 'boi', pos: [25, 0, 20] },
  { id: 'carro_de_boi', pos: [-28, 0, -4] },
];
const COR_MONT: Record<string, string> = { cavalo: '#6b4423', mula: '#7a6a58', jumento: '#9a9088', boi: '#d6cfc0', carroca: '#7a5530', canoa: '#5a3d22' };

function CorpoMontaria({ tipo }: { tipo: string }) {
  const cor = COR_MONT[tipo] ?? '#6b4423';
  if (tipo === 'carroca') return (
    <group>
      <mesh position={[0, 0.8, -0.6]} castShadow><boxGeometry args={[1.6, 0.5, 2.2]} /><meshStandardMaterial color={cor} /></mesh>
      {[-0.85, 0.85].map((x) => <mesh key={x} position={[x, 0.5, -0.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.5, 0.1, 16]} /><meshStandardMaterial color="#3a2614" /></mesh>)}
      <mesh position={[0, 0.8, 1.4]} castShadow><boxGeometry args={[0.7, 0.8, 1.5]} /><meshStandardMaterial color={COR_MONT.boi} /></mesh>
    </group>
  );
  const escala = tipo === 'jumento' ? 0.75 : tipo === 'boi' ? 1.1 : 1;
  return (
    <group scale={escala}>
      <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[0.6, 0.6, 1.6]} /><meshStandardMaterial color={cor} /></mesh>
      <mesh position={[0, 1.5, 0.85]} rotation={[0.6, 0, 0]} castShadow><boxGeometry args={[0.3, 0.7, 0.35]} /><meshStandardMaterial color={cor} /></mesh>
      {[[-0.22, 0.6], [0.22, 0.6], [-0.22, -0.6], [0.22, -0.6]].map(([x, z], i) =>
        <mesh key={i} position={[x, 0.35, z]}><boxGeometry args={[0.12, 0.7, 0.12]} /><meshStandardMaterial color={cor} /></mesh>)}
    </group>
  );
}

function Montarias() {
  const atualizar = useJogo((s) => s.atualizar);
  const montado = useJogo((s) => s.progresso?.montado);
  const posicoes = useRef(SPAWN_MONTARIAS.map((m) => new THREE.Vector3(...m.pos)));
  const refs = useRef<(THREE.Group | null)[]>([]);
  const indiceMontado = useRef<number | null>(null);
  const apertou = useRef(false);

  useFrame(() => {
    const clique = entrada.interagir && !apertou.current; apertou.current = entrada.interagir;
    if (clique) {
      if (indiceMontado.current !== null) {           // descer
        posicoes.current[indiceMontado.current].copy(jogadorPos).setY(0).add(new THREE.Vector3(1.2, 0, 0));
        indiceMontado.current = null; atualizar(() => ({ montado: null }));
      } else {                                          // montar/domar o mais próximo
        let melhor = -1, menor = 2.5;
        posicoes.current.forEach((p, i) => { const d = p.distanceTo(jogadorPos); if (d < menor) { menor = d; melhor = i; } });
        if (melhor >= 0) {
          const id = SPAWN_MONTARIAS[melhor].id; indiceMontado.current = melhor;
          atualizar((p) => ({ montado: id, montarias: p.montarias.includes(id) ? p.montarias : [...p.montarias, id] }));
        }
      }
    }
    refs.current.forEach((g, i) => {
      if (!g) return;
      if (i === indiceMontado.current) { g.position.copy(jogadorPos).setY(jogadorPos.y - 0.9 + 0.9); g.rotation.y = jogadorRot.y; }
      else g.position.copy(posicoes.current[i]);
    });
  });

  return <>{SPAWN_MONTARIAS.map((m, i) => {
    const def = MONTARIAS.find((x) => x.id === m.id)!;
    return <group key={i} ref={(g) => { refs.current[i] = g; }}><CorpoMontaria tipo={def.tipo} /></group>;
  })}</>;
}
export const jogadorRot = new THREE.Euler();

// ---------- Animais ----------
interface AnimalVivo { uid: number; def: Animal; vida: number; pos: THREE.Vector3; alvo: THREE.Vector3; ref: React.RefObject<THREE.Mesh>; }

function useAnimais(qtd: number) {
  return useMemo<AnimalVivo[]>(() => {
    const comuns = ANIMAIS.filter((a) => a.vida < 200);
    return Array.from({ length: qtd }, (_, i) => {
      const def = comuns[i % comuns.length];
      const pos = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
      return { uid: i, def, vida: def.vida, pos, alvo: pos.clone(), ref: React.createRef<THREE.Mesh>() };
    });
  }, [qtd]);
}

const COR_ANIMAL: Record<string, string> = { capivara: '#8b5a2b', veado: '#b07a3e', arara: '#d43a2f', queixada: '#3b3330', lobo_guara: '#c4652a', jacare: '#4b5d32', onca: '#d9a23b', harpia: '#6d6d6d' };

// ---------- Cena ----------
export function Mundo() {
  const atualizar = useJogo((s) => s.atualizar);
  const animais = useAnimais(24);
  const sol = useRef<THREE.DirectionalLight>(null);
  const sombra = PRESETS[useJogo((s) => s.config.qualidade)].sombra;

  const atacar = (pos: THREE.Vector3, alcance: number) => {
    for (const a of animais) {
      if (a.vida <= 0 || a.pos.distanceTo(pos) > alcance) continue;
      a.vida -= 20;
      if (a.vida <= 0) {
        // drops → materiais para evoluir armas/armaduras
        const ganhos: Partial<Record<Material, number>> = {};
        for (const d of a.def.drops) if (Math.random() < d.chance) ganhos[d.material] = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
        atualizar((p) => {
          const m = { ...p.materiais };
          for (const [k, v] of Object.entries(ganhos)) m[k as Material] = (m[k as Material] ?? 0) + (v ?? 0);
          return { materiais: m, fome: Math.min(100, p.fome + a.def.carne * 0.5) };
        });
        setTimeout(() => { a.vida = a.def.vida; a.pos.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80); }, 60_000); // renasce
      }
    }
  };

  const relogioCla = useRef(0);
  useFrame((_, dt) => {
    relogioCla.current += dt; if (relogioCla.current > 1) { relogioCla.current = 0; verificarInvasao(); }
    // sobrevivência + relógio
    atualizar((p) => {
      const hora = (p.horaDoDia + (24 / DURACAO_DIA) * dt) % 24;
      const novoDia = hora < p.horaDoDia;
      const fome = Math.max(0, p.fome - dt * 0.08), sede = Math.max(0, p.sede - dt * 0.12);
      const energia = Math.max(0, Math.min(100, p.energia + (entrada.correr ? -dt * 2 : dt * 1)));
      const vida = fome === 0 || sede === 0 ? Math.max(0, p.vida - dt * 0.5) : Math.min(100, p.vida + dt * 0.2);
      return { horaDoDia: hora, fome, sede, energia, vida, tempoJogado: p.tempoJogado + dt,
        diasSobrevividos: p.diasSobrevividos + (novoDia ? 1 : 0), posicao: jogadorPos.toArray() as [number, number, number] };
    });
    // luz do dia/noite
    const h = useJogo.getState().progresso?.horaDoDia ?? 12;
    const luz = Math.max(0.08, Math.sin(((h - 6) / 12) * Math.PI));
    if (sol.current) { sol.current.intensity = luz * 1.6; sol.current.position.set(Math.cos(((h - 6) / 12) * Math.PI) * 30, 25 * luz + 2, 10); }
    // IA simples dos animais
    for (const a of animais) {
      if (a.vida <= 0) { a.ref.current && (a.ref.current.visible = false); continue; }
      const dist = a.pos.distanceTo(jogadorPos);
      if (a.def.comportamento === 'foge' && dist < 8 && !entrada.furtivo) a.alvo.copy(a.pos).add(a.pos.clone().sub(jogadorPos).setY(0).normalize().multiplyScalar(6));
      else if (a.def.comportamento === 'agressivo' && dist < 10) a.alvo.copy(jogadorPos);
      else if (a.pos.distanceTo(a.alvo) < 0.5) a.alvo.set(a.pos.x + (Math.random() - 0.5) * 10, 0, a.pos.z + (Math.random() - 0.5) * 10);
      const passo = a.alvo.clone().sub(a.pos).setY(0);
      if (passo.length() > 0.1) a.pos.addScaledVector(passo.normalize(), a.def.velocidade * 0.5 * dt);
      if (a.def.comportamento === 'agressivo' && dist < 1.2) atualizar((p) => ({ vida: Math.max(0, p.vida - a.def.dano * dt * 0.5) }));
      if (a.ref.current) { a.ref.current.visible = true; a.ref.current.position.copy(a.pos).setY(0.35); a.ref.current.lookAt(a.alvo.x, 0.35, a.alvo.z); }
    }
  });

  return (
    <>
      <Graficos />
      <directionalLight ref={sol} castShadow position={[20, 25, 10]} intensity={1.4} shadow-mapSize={[sombra, sombra]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
      {/* chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#4f6b34" roughness={0.95} /></mesh>
      {/* casas / árvores provisórias (serão os cenários do Blender) */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = ((i * 37) % 90) - 45, z = ((i * 53) % 90) - 45;
        return i % 3 === 0
          ? <mesh key={i} position={[x, 2, z]} castShadow receiveShadow><boxGeometry args={[4, 4, 4]} /><meshStandardMaterial color="#d8c9a8" /></mesh>
          : <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.15, 0.25, 2.4]} /><meshStandardMaterial color="#5a3d22" /></mesh>
              <mesh position={[0, 3, 0]} castShadow><sphereGeometry args={[1.4, 8, 8]} /><meshStandardMaterial color="#2f5a24" /></mesh>
            </group>;
      })}
      {animais.map((a) => (
        <mesh key={a.uid} ref={a.ref} castShadow>
          <boxGeometry args={a.def.id === 'jacare' ? [0.5, 0.3, 1.8] : a.def.id === 'arara' ? [0.2, 0.3, 0.3] : [0.5, 0.5, 0.9]} />
          <meshStandardMaterial color={COR_ANIMAL[a.def.id] ?? '#777'} />
        </mesh>
      ))}
      <Montarias />
      <Batalha />
      <Jogador onAtacar={atacar} />
    </>
  );
}
