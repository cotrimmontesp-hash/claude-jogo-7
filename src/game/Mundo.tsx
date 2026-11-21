// Mundo 3D: herói animado, câmera (3 modos), cenário, montarias, animais, aves, dia/noite e sobrevivência.
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from './r3f';
import { useGLTF, useAnimations } from './drei';
import { Personagem3D, type Anim } from './Personagem3D';
import { Terreno, altura, ALTURA_AGUA } from './Terreno';
import { Cenario, REFUGIO } from './Cenario';
import { entrada } from './input';
import { useJogo, type ModoCamera } from '../state/store';
import { ANIMAIS, type Animal } from '../data/animals';
import { ARMAS, type Material } from '../data/items';
import { HEROIS } from '../data/characters';
import { MONTARIAS } from '../data/mounts';
import { enviarEstadoJogador } from '../net/client';
import { Graficos } from './Graficos';
import { PRESETS } from './qualidade';
import { Batalha } from './Batalha';
import { Agua, Grama, Particulas, RelogioVento } from './Efeitos';
import { verificarInvasao } from './claLogica';
import { modelo, ESCALA, MODELOS_HEROI, modeloArma } from './modelos';

const VEL_ANDAR = 2.6, VEL_CORRER = 6.2, VEL_FURTIVO = 1.5, GRAVIDADE = 24, PULO = 8.5;
const DURACAO_DIA = 36 * 60; // 24 min reais = 1 dia no jogo
const LIMITE = 165;

export const jogadorPos = new THREE.Vector3();
export const jogadorRot = new THREE.Euler();
export const yawCamera = (camera: THREE.Camera) => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return Math.atan2(d.x, d.z); };

// ---------- Câmera ----------
function CameraRig({ alvo, modo }: { alvo: React.RefObject<THREE.Group | null>; modo: ModoCamera }) {
  const { camera } = useThree();
  const yaw = useRef(Math.PI), pitch = useRef(0.32);
  const olhar = useRef(new THREE.Vector3());
  const ombroX = useRef(0), ombroZ = useRef(0);
  useFrame((_, dt) => {
    const p = alvo.current?.position; if (!p) return;
    const sens = useJogo.getState().config.sensibilidade;
    yaw.current -= entrada.olhar.dx * 0.005 * sens; pitch.current += entrada.olhar.dy * 0.004 * sens;
    pitch.current = THREE.MathUtils.clamp(pitch.current, -0.05, 1.1); entrada.olhar = { dx: 0, dy: 0 };
    const montado = !!useJogo.getState().progresso?.montado;
    const desejo = new THREE.Vector3();
    if (modo === 'terceira') {
      const d = montado ? 7.5 : 4.4;
      // câmera por cima do ombro direito (estilo GTA / Assassin's Creed)
      const ombro = montado ? 0.4 : 0.85;
      ombroX.current = Math.cos(yaw.current) * ombro; ombroZ.current = -Math.sin(yaw.current) * ombro;
      desejo.set(p.x + Math.sin(yaw.current) * Math.cos(pitch.current) * d + ombroX.current, p.y + 1.75 + Math.sin(pitch.current) * d, p.z + Math.cos(yaw.current) * Math.cos(pitch.current) * d + ombroZ.current);
      desejo.y = Math.max(desejo.y, altura(desejo.x, desejo.z) + 0.8);   // câmera não entra no chão
    } else if (modo === 'cima') desejo.set(p.x, p.y + 17, p.z + 11);
    else desejo.set(p.x, p.y + 2.4, p.z + 12);
    camera.position.lerp(desejo, 1 - Math.pow(0.0005, dt));
    const terceira = modo === 'terceira';
    olhar.current.lerp(new THREE.Vector3(p.x + (terceira ? ombroX.current : 0), p.y + (terceira ? 1.55 : 1.3), p.z + (terceira ? ombroZ.current : 0)), 1 - Math.pow(0.0001, dt));
    camera.lookAt(olhar.current);
  });
  return null;
}

// ---------- Cavalo (modelo animado) ----------
function Cavalo({ tint, escala = 1, galopando, refExterno }: { tint?: string; escala?: number; galopando: number; refExterno?: (g: THREE.Group | null) => void }) {
  const { scene, animations } = useGLTF(modelo('animais/cavalo'));
  const copia = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); if (tint) o.material.color = new THREE.Color(tint); } });
    return c;
  }, [scene, tint]);
  const g = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, g);
  useEffect(() => { const a = Object.values(actions)[0]; a?.play(); }, [actions]);
  useEffect(() => { const a = Object.values(actions)[0]; if (a) { a.timeScale = galopando; a.paused = galopando < 0.05; } }, [galopando, actions]);
  return (
    <group ref={(x) => { (g as any).current = x; refExterno?.(x); }}>
      <primitive object={copia} scale={ESCALA.cavalo * escala} />
    </group>
  );
}

// ---------- Jogador ----------
function Jogador({ onAtacar }: { onAtacar: (pos: THREE.Vector3, alcance: number, dano: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const velY = useRef(0), noChao = useRef(true), golpe = useRef(0), envio = useRef(0);
  const [anim, setAnim] = useState<Anim>('Idle');
  const [galope, setGalope] = useState(0);
  const { camera } = useThree();
  const progresso = useMemo(() => useJogo.getState().progresso!, []);   // só os dados iniciais
  const heroiId = useJogo((s) => s.progresso?.heroi ?? 'ines');
  const skin = useJogo((s) => s.progresso?.skinAtual);
  const modo = useJogo((s) => s.config.camera);
  const montado = useJogo((s) => s.progresso?.montado ?? null);
  const armaId = useJogo((s) => s.progresso?.equipado.arma ?? 'faca');
  const arma = ARMAS.find((a) => a.id === armaId);
  const heroi = HEROIS.find((h) => h.id === heroiId)!;
  const mont = montado ? MONTARIAS.find((m) => m.id === montado) : null;

  useEffect(() => { const [x, , z] = progresso.posicao; ref.current?.position.set(x, altura(x, z), z); }, []);

  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    dt = Math.min(dt, 0.05);
    const { x, y } = entrada.mover;
    let dir = new THREE.Vector3();
    if (modo === 'lateral') dir.set(x, 0, 0);
    else if (modo === 'cima') dir.set(x, 0, -y);
    else {
      const yaw = yawCamera(camera); const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const r = new THREE.Vector3(-f.z, 0, f.x);
      dir = f.multiplyScalar(y).add(r.multiplyScalar(x));
    }
    const intens = Math.min(1, dir.length());
    const vel = mont ? (entrada.correr ? mont.velocidade : mont.velocidade * 0.4)
      : (entrada.furtivo ? VEL_FURTIVO : entrada.correr ? VEL_CORRER : VEL_ANDAR) * heroi.bonus.agilidade;
    if (intens > 0.05) {
      g.position.addScaledVector(dir.normalize(), vel * intens * dt);
      const alvoRot = Math.atan2(dir.x, dir.z);
      let dif = alvoRot - g.rotation.y; dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      g.rotation.y += dif * Math.min(1, dt * 12);
    }
    g.position.x = THREE.MathUtils.clamp(g.position.x, -LIMITE, LIMITE); g.position.z = THREE.MathUtils.clamp(g.position.z, -LIMITE, LIMITE);
    if (modo === 'lateral') g.position.z = THREE.MathUtils.lerp(g.position.z, 0, 0.1);

    // pulo, gravidade e chão com relevo (não afunda no rio)
    const chao = Math.max(altura(g.position.x, g.position.z), ALTURA_AGUA - 0.9);
    if (entrada.pular && noChao.current && !mont) { velY.current = PULO; noChao.current = false; }
    velY.current -= GRAVIDADE * dt; g.position.y += velY.current * dt;
    if (g.position.y <= chao) { g.position.y = chao; velY.current = 0; noChao.current = true; }

    // ataque
    golpe.current -= dt;
    if (entrada.atacar && golpe.current <= 0 && !mont) {
      golpe.current = 0.65 / (arma?.velocidade ?? 1);
      onAtacar(g.position.clone().add(new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y)).multiplyScalar(1)), (arma?.alcance ?? 1.2) + 0.8, (arma?.dano ?? 8) * heroi.bonus.forca);
    }

    // animação
    let novo: Anim;
    if (mont) novo = 'Sit_Floor_Idle';
    else if (golpe.current > 0.25) novo = arma?.tipo === 'machado' || arma?.tipo === 'maca' ? '1H_Melee_Attack_Chop' : arma?.tipo === 'adaga' || arma?.tipo === 'lamina_oculta' ? '1H_Melee_Attack_Stab' : '1H_Melee_Attack_Slice_Diagonal';
    else if (!noChao.current) novo = 'Jump_Idle';
    else if (intens > 0.05) novo = entrada.furtivo ? 'Walking_C' : entrada.correr ? 'Running_A' : 'Walking_A';
    else novo = 'Idle';
    if (novo !== anim) setAnim(novo);
    const gal = mont && intens > 0.05 ? (entrada.correr ? 1.6 : 0.7) : 0;
    if (Math.abs(gal - galope) > 0.1) setGalope(gal);

    envio.current += dt;
    if (envio.current > 0.066) { envio.current = 0; enviarEstadoJogador({ p: g.position.toArray(), r: g.rotation.y, anim: novo }); }
    jogadorPos.copy(g.position); jogadorRot.copy(g.rotation);
  });

  const skinCor = skin?.includes('sombra') ? '#222' : skin?.includes('irmandade') ? '#f4f1ea' : undefined;
  const tintMont = mont?.id === 'cavalo_selvagem' ? '#8b6a46' : mont?.id === 'mula' ? '#6d6257' : mont?.id === 'jumento' ? '#8f877f' : mont?.id === 'corcel_lanterna' ? '#f1e6c8' : mont?.id === 'cavalo_guerra' ? '#4a4040' : undefined;

  return (
    <>
      <group ref={ref}>
        {mont && <Cavalo tint={tintMont} escala={mont.tipo === 'jumento' ? 0.75 : mont.tipo === 'mula' ? 0.88 : 1} galopando={galope} />}
        <Personagem3D arquivo={MODELOS_HEROI[heroiId]} anim={anim} arma={mont ? null : modeloArma(armaId, arma?.tipo)}
          escudo={false} posicao={mont ? [0, 1.05, -0.1] : [0, 0, 0]} cor={skinCor} />
      </group>
      <CameraRig alvo={ref} modo={modo} />
    </>
  );
}

// ---------- Montarias soltas no mapa (aperte ✋/E perto para montar/domar) ----------
const SPAWN_MONTARIAS: { id: string; pos: [number, number] }[] = [
  { id: 'cavalo_selvagem', pos: [14, 30] }, { id: 'cavalo_selvagem', pos: [-50, 60] }, { id: 'cavalo_crioulo', pos: [REFUGIO[0] + 6, REFUGIO[1] - 14] },
  { id: 'mula', pos: [8, 60] }, { id: 'jumento', pos: [-70, 40] }, { id: 'mangalarga', pos: [-14, 8] },
];

function Montarias() {
  const atualizar = useJogo((s) => s.atualizar);
  const montado = useJogo((s) => s.progresso?.montado);
  const pos = useRef(SPAWN_MONTARIAS.map((m) => new THREE.Vector3(m.pos[0], altura(m.pos[0], m.pos[1]), m.pos[1])));
  const refs = useRef<(THREE.Group | null)[]>([]);
  const [indice, setIndice] = useState<number | null>(null);
  const apertou = useRef(false);

  useFrame(({ clock }) => {
    const clique = entrada.interagir && !apertou.current; apertou.current = entrada.interagir;
    if (clique) {
      if (indice !== null) {
        const p = jogadorPos.clone().add(new THREE.Vector3(1.6, 0, 0)); p.y = altura(p.x, p.z);
        pos.current[indice].copy(p); setIndice(null); atualizar(() => ({ montado: null }));
      } else {
        let melhor = -1, menor = 3.2;
        pos.current.forEach((p, i) => { const d = p.distanceTo(jogadorPos); if (d < menor) { menor = d; melhor = i; } });
        if (melhor >= 0) {
          const id = SPAWN_MONTARIAS[melhor].id; setIndice(melhor);
          atualizar((p) => ({ montado: id, montarias: p.montarias.includes(id) ? p.montarias : [...p.montarias, id] }));
        }
      }
    }
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.visible = i !== indice;
      g.position.copy(pos.current[i]);
      g.rotation.y = Math.sin(clock.elapsedTime * 0.1 + i) * 0.6 + i;   // pastando, virando devagar
    });
  });
  useEffect(() => { if (!montado) setIndice(null); }, [montado]);

  return <>{SPAWN_MONTARIAS.map((m, i) => (
    <group key={i} ref={(g) => { refs.current[i] = g; }}>
      <Cavalo tint={m.id === 'cavalo_selvagem' ? '#8b6a46' : m.id === 'mula' ? '#6d6257' : m.id === 'jumento' ? '#8f877f' : undefined}
        escala={m.id === 'jumento' ? 0.75 : m.id === 'mula' ? 0.88 : 1} galopando={0} />
    </group>
  ))}</>;
}

// ---------- Aves voando (araras e garças) ----------
function Aves() {
  const arara = useGLTF(modelo('animais/arara')), garca = useGLTF(modelo('animais/cegonha')), flam = useGLTF(modelo('animais/flamingo'));
  const bando = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const src = [arara, arara, garca, flam][i % 4]; const c = src.scene.clone(true);
    const mixer = new THREE.AnimationMixer(c); mixer.clipAction(src.animations[0]).setDuration(0.9 + Math.random() * 0.4).play();
    return { obj: c, mixer, raio: 25 + Math.random() * 60, vel: 0.12 + Math.random() * 0.12, alt: 18 + Math.random() * 20, fase: Math.random() * 6, cx: (Math.random() - 0.5) * 120, cz: (Math.random() - 0.5) * 120 };
  }), [arara, garca, flam]);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    bando.forEach((b) => {
      b.mixer.update(dt);
      const a = t * b.vel + b.fase;
      b.obj.position.set(b.cx + Math.cos(a) * b.raio, b.alt + Math.sin(a * 2) * 2, b.cz + Math.sin(a) * b.raio);
      b.obj.rotation.y = -a;                          // aponta na direção do voo
    });
  });
  return <>{bando.map((b, i) => <primitive key={i} object={b.obj} scale={ESCALA.ave * (i % 4 === 0 || i % 4 === 1 ? 1 : 1.6)} />)}</>;
}

// ---------- Animais terrestres (corpo low-poly com patas animadas) ----------
interface AnimalVivo { uid: number; def: Animal; vida: number; pos: THREE.Vector3; alvo: THREE.Vector3; ref: React.RefObject<THREE.Group | null>; passo: number; }

const COR_ANIMAL: Record<string, [string, string]> = {
  capivara: ['#7b5634', '#5e3f24'], veado: ['#b4834d', '#e8dcc6'], queixada: ['#3b3330', '#1f1b19'], lobo_guara: ['#c4652a', '#2a1a10'],
  jacare: ['#4b5d32', '#c9b97a'], onca: ['#d9a23b', '#2b1d0e'], harpia: ['#6d6d6d', '#e9e9e9'], arara: ['#d43a2f', '#2f6ad4'],
};
const FORMA: Record<string, { corpo: [number, number, number]; pata: number; cabeca: number; cauda?: boolean }> = {
  capivara: { corpo: [0.5, 0.45, 1.0], pata: 0.25, cabeca: 0.28 }, veado: { corpo: [0.4, 0.5, 1.1], pata: 0.75, cabeca: 0.22 },
  queixada: { corpo: [0.45, 0.5, 0.95], pata: 0.3, cabeca: 0.27 }, lobo_guara: { corpo: [0.35, 0.4, 1.0], pata: 0.8, cabeca: 0.22, cauda: true },
  jacare: { corpo: [0.6, 0.3, 2.4], pata: 0.18, cabeca: 0.3, cauda: true }, onca: { corpo: [0.45, 0.5, 1.4], pata: 0.5, cabeca: 0.3, cauda: true },
};

function CorpoAnimal({ id, refPatas }: { id: string; refPatas: (g: THREE.Group | null, i: number) => void }) {
  const f = FORMA[id] ?? FORMA.capivara; const [c1, c2] = COR_ANIMAL[id] ?? ['#777', '#555'];
  const [lx, ly, lz] = f.corpo;
  return (
    <group position={[0, f.pata, 0]}>
      <mesh castShadow scale={[lx, ly, lz]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={c1} roughness={0.9} /></mesh>
      <mesh castShadow position={[0, ly * 0.45, lz * 0.95]} scale={[f.cabeca, f.cabeca * 0.9, f.cabeca * 1.4]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color={c1} roughness={0.9} /></mesh>
      <mesh position={[0, ly * 0.35, lz * 0.95 + f.cabeca * 1.2]} scale={[f.cabeca * 0.5, f.cabeca * 0.45, f.cabeca * 0.6]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={c2} /></mesh>
      {id === 'veado' && [-1, 1].map((s) => <mesh key={s} position={[s * 0.12, ly + 0.35, lz * 0.9]} rotation={[0.3, 0, s * 0.4]}><coneGeometry args={[0.04, 0.5, 5]} /><meshStandardMaterial color="#6b5236" /></mesh>)}
      {id === 'onca' && Array.from({ length: 10 }).map((_, i) => <mesh key={i} position={[Math.sin(i * 2.3) * lx * 0.9, Math.cos(i * 1.7) * ly * 0.5, (i / 10 - 0.5) * lz * 1.6]} scale={0.09}><sphereGeometry args={[1, 6, 5]} /><meshStandardMaterial color={c2} /></mesh>)}
      {f.cauda && <mesh position={[0, 0, -lz * 1.1]} rotation={[-1.2, 0, 0]}><coneGeometry args={[ly * 0.35, lz * 0.9, 6]} /><meshStandardMaterial color={c1} /></mesh>}
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => (
        <group key={i} ref={(g) => refPatas(g, i)} position={[sx * lx * 0.6, 0, sz * lz * 0.6]}>
          <mesh position={[0, -f.pata / 2, 0]} castShadow><cylinderGeometry args={[0.07, 0.05, f.pata, 6]} /><meshStandardMaterial color={c1} /></mesh>
        </group>
      ))}
    </group>
  );
}

function useAnimais(qtd: number) {
  return useMemo<AnimalVivo[]>(() => {
    const comuns = ANIMAIS.filter((a) => a.vida < 200 && FORMA[a.id]);
    return Array.from({ length: qtd }, (_, i) => {
      const def = comuns[i % comuns.length];
      let x = 0, z = 0; do { x = (Math.random() - 0.5) * 300; z = (Math.random() - 0.5) * 300; } while (Math.hypot(x, z) < 55);
      if (def.id === 'jacare') x = 70 + (Math.random() - 0.5) * 10;
      const pos = new THREE.Vector3(x, altura(x, z), z);
      return { uid: i, def, vida: def.vida, pos, alvo: pos.clone(), ref: React.createRef<THREE.Group>(), passo: Math.random() * 6 };
    });
  }, [qtd]);
}

// ---------- Cena ----------
export function Mundo() {
  const atualizar = useJogo((s) => s.atualizar);
  const qualidade = useJogo((s) => s.config.qualidade);
  const q = PRESETS[qualidade];
  const animais = useAnimais(qualidade === 'baixo' ? 14 : 26);
  const patas = useRef<Record<number, (THREE.Group | null)[]>>({});
  const sol = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const relogioCla = useRef(0);

  const atacar = (pos: THREE.Vector3, alcance: number, dano: number) => {
    for (const a of animais) {
      if (a.vida <= 0 || a.pos.distanceTo(pos) > alcance + 0.8) continue;
      a.vida -= dano;
      if (a.vida <= 0) {
        const ganhos: Partial<Record<Material, number>> = {};
        for (const d of a.def.drops) if (Math.random() < d.chance) ganhos[d.material] = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
        atualizar((p) => {
          const m = { ...p.materiais };
          for (const [k, v] of Object.entries(ganhos)) m[k as Material] = (m[k as Material] ?? 0) + (v ?? 0);
          return { materiais: m, fome: Math.min(100, p.fome + a.def.carne * 0.5) };
        });
        setTimeout(() => { a.vida = a.def.vida; }, 90_000);
      } else if (a.def.comportamento !== 'agressivo') a.alvo.copy(a.pos).add(a.pos.clone().sub(jogadorPos).setY(0).normalize().multiplyScalar(14));
    }
  };

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    relogioCla.current += dt; if (relogioCla.current > 1) { relogioCla.current = 0; verificarInvasao(); }
    atualizar((p) => {
      const hora = (p.horaDoDia + (24 / DURACAO_DIA) * dt) % 24;
      const novoDia = hora < p.horaDoDia;
      const fome = Math.max(0, p.fome - dt * 0.06), sede = Math.max(0, p.sede - dt * 0.09);
      const energia = Math.max(0, Math.min(100, p.energia + (entrada.correr && !p.montado ? -dt * 2 : dt * 1.2)));
      const vida = fome === 0 || sede === 0 ? Math.max(0, p.vida - dt * 0.5) : Math.min(100, p.vida + dt * 0.25);
      return { horaDoDia: hora, fome, sede, energia, vida, tempoJogado: p.tempoJogado + dt,
        diasSobrevividos: p.diasSobrevividos + (novoDia ? 1 : 0), posicao: jogadorPos.toArray() as [number, number, number] };
    });

    // sol / lua: luz forte e quente de dia, azulada e suave de noite (sem ficar tudo preto)
    const h = useJogo.getState().progresso?.horaDoDia ?? 12;
    const ang = ((h - 6) / 12) * Math.PI, elev = Math.sin(ang);
    const dia = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
    if (sol.current) {
      const ox = Math.cos(ang) * 60, oy = Math.max(Math.abs(elev), 0.35) * 70;
      sol.current.position.set(jogadorPos.x + (dia > 0.5 ? ox : -ox * 0.6), jogadorPos.y + oy, jogadorPos.z + 30);
      sol.current.target.position.copy(jogadorPos); sol.current.target.updateMatrixWorld();
      sol.current.intensity = THREE.MathUtils.lerp(0.55, elev < 0.3 ? 2.2 : 3.0, dia);
      sol.current.color.set(dia < 0.5 ? '#9fb4ff' : elev < 0.3 ? '#ffb070' : '#fff2dc');
    }
    if (hemi.current) { hemi.current.intensity = THREE.MathUtils.lerp(0.55, 0.9, dia); hemi.current.color.set(dia < 0.5 ? '#5a6fa8' : '#cfe3ff'); }

    // animais
    for (const a of animais) {
      const g = a.ref.current; if (!g) continue;
      if (a.vida <= 0) { g.visible = false; continue; }
      g.visible = true;
      const dist = a.pos.distanceTo(jogadorPos);
      if (a.def.comportamento === 'foge' && dist < 10 && !entrada.furtivo) a.alvo.copy(a.pos).add(a.pos.clone().sub(jogadorPos).setY(0).normalize().multiplyScalar(8));
      else if (a.def.comportamento === 'agressivo' && dist < 12) a.alvo.copy(jogadorPos);
      else if (a.pos.distanceTo(a.alvo) < 0.6 && Math.random() < 0.01) a.alvo.set(a.pos.x + (Math.random() - 0.5) * 16, 0, a.pos.z + (Math.random() - 0.5) * 16);
      const passo = a.alvo.clone().sub(a.pos).setY(0);
      const andando = passo.length() > 0.6;
      if (andando) {
        const v = a.def.velocidade * (dist < 12 ? 0.75 : 0.25);
        a.pos.addScaledVector(passo.normalize(), v * dt); a.passo += v * dt * 3;
        g.rotation.y = Math.atan2(passo.x, passo.z);
      }
      a.pos.x = THREE.MathUtils.clamp(a.pos.x, -LIMITE, LIMITE); a.pos.z = THREE.MathUtils.clamp(a.pos.z, -LIMITE, LIMITE);
      a.pos.y = Math.max(altura(a.pos.x, a.pos.z), ALTURA_AGUA - 0.4);
      g.position.copy(a.pos);
      (patas.current[a.uid] ?? []).forEach((pt, i) => { if (pt) pt.rotation.x = andando ? Math.sin(a.passo + (i % 3 === 0 ? 0 : Math.PI)) * 0.6 : 0; });
      if (a.def.comportamento === 'agressivo' && dist < 1.6) atualizar((p) => ({ vida: Math.max(0, p.vida - a.def.dano * dt * 0.5) }));
    }
  });

  return (
    <>
      <Graficos />
      <hemisphereLight ref={hemi} args={['#cfe3ff', '#5a4a30', 0.9]} />
      <directionalLight ref={sol} castShadow intensity={3} position={[40, 70, 30]}
        shadow-mapSize={[q.sombra, q.sombra]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-near={1} shadow-camera-far={220} />
      <RelogioVento />
      <Suspense fallback={null}><Terreno segmentos={qualidade === 'baixo' ? 120 : qualidade === 'medio' ? 180 : 260} /></Suspense>
      <Suspense fallback={null}><Agua /></Suspense>
      {q.grama > 0 && <Grama quantidade={q.grama} />}
      <Particulas />
      <Suspense fallback={null}><Cenario /></Suspense>
      <Suspense fallback={null}><Montarias /></Suspense>
      <Suspense fallback={null}><Aves /></Suspense>
      {animais.map((a) => (
        <group key={a.uid} ref={a.ref}>
          <CorpoAnimal id={a.def.id} refPatas={(g, i) => { (patas.current[a.uid] ??= [])[i] = g; }} />
        </group>
      ))}
      <Suspense fallback={null}><Batalha /></Suspense>
      <Suspense fallback={null}><Jogador onAtacar={atacar} /></Suspense>
    </>
  );
}
