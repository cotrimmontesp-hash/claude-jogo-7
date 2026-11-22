// Mundo 3D: herói animado, câmera (3 modos), cenário, montarias, animais, aves, dia/noite e sobrevivência.
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from './r3f';
import { useGLTF, useAnimations } from './drei';
import { Personagem3D, type Anim } from './Personagem3D';
import { Terreno, altura, ALTURA_AGUA } from './Terreno';
import { Cenario, REFUGIO } from './Cenario';
import { entrada, usarPendente, consumirUsar } from './input';
import { useJogo, type ModoCamera } from '../state/store';
import { ANIMAIS, type Animal } from '../data/animals';
import { ARMAS, type Material } from '../data/items';
import { HEROIS } from '../data/characters';
import { MONTARIAS } from '../data/mounts';
import { enviarEstadoJogador } from '../net/client';
import { Graficos } from './Graficos';
import { PRESETS, ORDEM } from './qualidade';
import { LIMITE_MUNDO, LUGAR, ILHAS } from './mapa';
import { Fortaleza, colidirFortaleza } from './Fortaleza';
export const SPAWN_CLA: [number, number] = [-436, -318];
import { HistoriaMundo, danoNoChefe } from './HistoriaMundo';
import { Moradores } from './Moradores';
import { pedidoTeleporte } from './teleporte';
import { animalAbatido, missaoAtual } from './historia';
import { Batalha } from './Batalha';
import { Agua, Grama, Particulas, RelogioVento } from './Efeitos';
import { verificarInvasao, useBatalha } from './claLogica';
import { modelo, ESCALA, MODELOS_HEROI, modeloArma } from './modelos';
import { Interior, LogicaCasas, colidirCasas, limitarInterior, dentroDeCasa, posicaoParaSalvar, useInterior, INTERIOR } from './Interiores';
import { tocar, atualizarAmbiente, definirVolume, prepararSom } from './som';
import { distRio } from './Terreno';
import { CASAS_EM_CHAMAS } from './Cenario';
import { useHistoria } from './historia';

const VEL_ANDAR = 2.6, VEL_CORRER = 6.2, VEL_FURTIVO = 1.5, GRAVIDADE = 24, PULO = 8.5;
const DURACAO_DIA = 36 * 60; // 24 min reais = 1 dia no jogo
const LIMITE = LIMITE_MUNDO;

export const jogadorPos = new THREE.Vector3();
export let avisoQualidade: (t: string) => void = () => {};
export const definirAvisoQualidade = (f: (t: string) => void) => { avisoQualidade = f; };
export const jogadorRot = new THREE.Euler();
export const cameraInfo = { yaw: 0 };   // para a bússola do HUD
// ---------- Câmera ----------
// O mouse gira a câmera na hora (sem atraso); só o ponto que segue o personagem é suavizado.
function CameraRig({ alvo, modo }: { alvo: React.RefObject<THREE.Group | null>; modo: ModoCamera }) {
  const { camera } = useThree();
  const yaw = useRef(Math.PI), pitch = useRef(0.28);
  const pivo = useRef<THREE.Vector3 | null>(null);
  const distAtual = useRef(4.4);
  useFrame((_, dt) => {
    const p = alvo.current?.position; if (!p) return;
    dt = Math.min(dt, 0.05);
    const sens = useJogo.getState().config.sensibilidade;
    yaw.current -= entrada.olhar.dx * 0.0052 * sens;
    pitch.current = THREE.MathUtils.clamp(pitch.current + entrada.olhar.dy * 0.0042 * sens, -0.35, 1.25);
    entrada.olhar = { dx: 0, dy: 0 };
    const montado = !!useJogo.getState().progresso?.montado;

    // ponto de foco suave atrás do ombro
    const alvoPivo = new THREE.Vector3(p.x, p.y + (montado ? 2.3 : 1.55), p.z);
    if (!pivo.current) pivo.current = alvoPivo.clone();
    pivo.current.lerp(alvoPivo, 1 - Math.pow(0.00002, dt));

    if (modo === 'terceira') {
      const distDesejada = (montado ? 6.5 : 4.2) * entrada.zoom;
      distAtual.current = THREE.MathUtils.lerp(distAtual.current, distDesejada, 1 - Math.pow(0.001, dt));
      const d = distAtual.current;
      const ombro = montado ? 0.35 : 0.75;
      const dir = new THREE.Vector3(Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), Math.cos(yaw.current) * Math.cos(pitch.current));
      const direita = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      const foco = pivo.current.clone().addScaledVector(direita, ombro);
      const pos = foco.clone().addScaledVector(dir, d);
      pos.y = Math.max(pos.y, altura(pos.x, pos.z) + 0.6);                    // não entra no chão
      camera.position.copy(pos);
      camera.lookAt(foco);
    } else {
      const off = modo === 'cima' ? new THREE.Vector3(0, 17, 11) : new THREE.Vector3(0, 2.4, 12);
      camera.position.lerp(p.clone().add(off), 1 - Math.pow(0.0005, dt));
      camera.lookAt(p.x, p.y + 1.3, p.z);
    }
  });
  return null;
}
export const yawCamera = (camera: THREE.Camera) => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return Math.atan2(d.x, d.z); };

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
// Combo de 3 golpes: corte, golpe de cima e finalização (chute / combo de machado)
const COMBO: Anim[] = ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '2H_Melee_Attack_Slice'];
const DURACAO_GOLPE = [0.52, 0.56, 0.78];

function Jogador({ onAtacar, alvoPerto }: { onAtacar: (pos: THREE.Vector3, alcance: number, dano: number) => void; alvoPerto: (p: THREE.Vector3, raio: number) => THREE.Vector3 | null }) {
  const ref = useRef<THREE.Group>(null);
  const velY = useRef(0), noChao = useRef(true), golpe = useRef(0), envio = useRef(0), passoDist = useRef(0);
  const combo = useRef(0), desdeUltimo = useRef(9), danoEm = useRef(-1), duracaoAtual = useRef(0.5);
  const [gatilho, setGatilho] = useState(0);
  const [anim, setAnim] = useState<Anim>('Idle');
  const [galope, setGalope] = useState(0);
  const { camera } = useThree();
  const progresso = useMemo(() => useJogo.getState().progresso!, []);   // só os dados iniciais
  const atualizar = useJogo((s) => s.atualizar);
  const heroiId = useJogo((s) => s.progresso?.heroi ?? 'ines');
  const skin = useJogo((s) => s.progresso?.skinAtual);
  const modo = useJogo((s) => s.config.camera);
  const montado = useJogo((s) => s.progresso?.montado ?? null);
  const armaId = useJogo((s) => s.progresso?.equipado.arma ?? 'faca');
  const arma = ARMAS.find((a) => a.id === armaId);
  const heroi = HEROIS.find((h) => h.id === heroiId)!;
  const mont = montado ? MONTARIAS.find((m) => m.id === montado) : null;

  useEffect(() => {
    let [x, , z] = progresso.posicao;
    // você sempre nasce no seu clã (saves antigos são levados para o Refúgio uma vez)
    if (progresso.escolhas?.nasceu_cla !== '1') {
      [x, z] = SPAWN_CLA; atualizar((p) => ({ escolhas: { ...p.escolhas, nasceu_cla: '1' }, posicao: [x, altura(x, z), z] }));
    }
    ref.current?.position.set(x, altura(x, z), z);
  }, []);

  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    dt = Math.min(dt, 0.05);
    // caiu (vida zerada): acorda no Refúgio do clã
    const pv = useJogo.getState().progresso;
    if (pv && pv.vida <= 0 && !useBatalha.getState().ativa) {
      const ch = useHistoria.getState().chefe;
      if (!ch || ch.def.chefao || ch.vida <= 0) {
        const [sx, sz] = SPAWN_CLA; pedidoTeleporte.alvo = new THREE.Vector3(sx, altura(sx, sz), sz);
        useInterior.setState({ casa: null, loja: null });
        atualizar(() => ({ vida: 60 }));
        useHistoria.setState({ chefe: ch?.def.chefao ? null : ch, aviso: ch?.def.chefao ? '☠ O Chefão te derrubou! Você acordou no Refúgio. Fique mais forte e volte.' : '😵 Você desmaiou e acordou no Refúgio do seu clã.' });
        setTimeout(() => useHistoria.setState({ aviso: '' }), 5000);
      }
    }
    if (pedidoTeleporte.alvo) {
      g.position.copy(pedidoTeleporte.alvo); pedidoTeleporte.alvo = null; velY.current = 0;
      if (Math.hypot(g.position.x - INTERIOR.x, g.position.z - INTERIOR.z) > 60 && dentroDeCasa()) useInterior.setState({ casa: null, dica: '' });
    }   // canoa / invasão
    const { x, y } = entrada.mover;
    let dir = new THREE.Vector3();
    if (modo === 'lateral') dir.set(x, 0, 0);
    else if (modo === 'cima') dir.set(x, 0, -y);
    else {
      const yaw = yawCamera(camera); const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const r = new THREE.Vector3(-f.z, 0, f.x);
      dir = f.multiplyScalar(y).add(r.multiplyScalar(x));
    }
    const intens = Math.min(1, dir.length());
    const atacando = golpe.current > 0;
    const vel = (mont ? (entrada.correr ? mont.velocidade : mont.velocidade * 0.4)
      : (entrada.furtivo ? VEL_FURTIVO : entrada.correr ? VEL_CORRER : VEL_ANDAR) * heroi.bonus.agilidade) * (atacando ? 0.25 : 1);
    if (intens > 0.05 && !(atacando && golpe.current > duracaoAtual.current * 0.4)) {
      const antes = g.position.clone();
      g.position.addScaledVector(dir.normalize(), vel * intens * dt);
      if (noChao.current) {                                               // passos / galope
        passoDist.current += vel * intens * dt;
        const passoLen = mont ? (entrada.correr ? 3.4 : 2.2) : entrada.correr ? 2.1 : entrada.furtivo ? 1.1 : 1.5;
        if (passoDist.current > passoLen) { passoDist.current = 0; tocar(mont ? 'galope' : g.position.y < ALTURA_AGUA - 0.3 ? 'passoAgua' : 'passo', entrada.furtivo ? 0.4 : 1); }
      }
      if (!dentroDeCasa() && altura(g.position.x, g.position.z) < -3.2) g.position.copy(antes);   // mar fundo: só de canoa (cais)
      const alvoRot = Math.atan2(dir.x, dir.z);
      let dif = alvoRot - g.rotation.y; dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      g.rotation.y += dif * Math.min(1, dt * 12);
    }
    g.position.x = THREE.MathUtils.clamp(g.position.x, -LIMITE, LIMITE); g.position.z = THREE.MathUtils.clamp(g.position.z, -LIMITE, LIMITE);
    if (modo === 'lateral') g.position.z = THREE.MathUtils.lerp(g.position.z, 0, 0.1);
    if (dentroDeCasa()) limitarInterior(g.position); else { colidirCasas(g.position); colidirFortaleza(g.position); }   // paredes sólidas

    // pulo, gravidade e chão com relevo (não afunda no rio)
    const chao = dentroDeCasa() ? INTERIOR.y : Math.max(altura(g.position.x, g.position.z), ALTURA_AGUA - 0.9);
    if (entrada.pular && noChao.current && !mont) { velY.current = PULO; noChao.current = false; tocar('pulo'); }
    velY.current -= GRAVIDADE * dt; g.position.y += velY.current * dt;
    if (g.position.y <= chao) { g.position.y = chao; velY.current = 0; noChao.current = true; }

    // ataque
    // ---- ataque em combo ----
    golpe.current -= dt; desdeUltimo.current += dt;
    const velArma = Math.max(0.6, arma?.velocidade ?? 1);
    if (entrada.atacar && golpe.current <= 0.12 && !mont) {               // dá para "emendar" o próximo golpe um pouco antes
      combo.current = desdeUltimo.current < 0.9 ? (combo.current + 1) % 3 : 0;
      duracaoAtual.current = DURACAO_GOLPE[combo.current] / velArma;
      golpe.current = duracaoAtual.current; danoEm.current = duracaoAtual.current * 0.55; desdeUltimo.current = 0;
      // mira automática: vira para o inimigo/animal mais perto
      const alvo = alvoPerto(g.position, 4.5);
      if (alvo) g.rotation.y = Math.atan2(alvo.x - g.position.x, alvo.z - g.position.z);
      else if (modo === 'terceira' && intens < 0.05) g.rotation.y = yawCamera(camera);   // sem alvo: golpeia para onde a câmera olha
      setGatilho((n) => n + 1);
      tocar(combo.current === 2 ? 'espadaForte' : 'espada');
    }
    if (golpe.current > 0) {
      const frente = new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
      if (golpe.current > duracaoAtual.current * 0.55) g.position.addScaledVector(frente, (combo.current === 2 ? 4.2 : 3) * dt);   // investida
      if (danoEm.current > 0 && golpe.current <= danoEm.current) {
        danoEm.current = -1;
        const forte = combo.current === 2 ? 1.7 : 1;
        onAtacar(g.position.clone().addScaledVector(frente, 1.1), (arma?.alcance ?? 1.2) + 0.9, (arma?.dano ?? 8) * heroi.bonus.forca * forte);
      }
    }

    // animação
    let novo: Anim;
    if (mont) novo = 'Sit_Floor_Idle';
    else if (golpe.current > 0.02) novo = COMBO[combo.current];
    else if (!noChao.current) novo = 'Jump_Idle';
    else if (intens > 0.05) novo = entrada.furtivo ? 'Walking_C' : entrada.correr ? 'Running_A' : 'Walking_A';
    else novo = 'Idle';
    if (novo !== anim) setAnim(novo);
    const gal = mont && intens > 0.05 ? (entrada.correr ? 1.6 : 0.7) : 0;
    if (Math.abs(gal - galope) > 0.1) setGalope(gal);

    envio.current += dt;
    if (envio.current > 0.066) { envio.current = 0; enviarEstadoJogador({ p: g.position.toArray(), r: g.rotation.y, anim: novo }); }
    jogadorPos.copy(g.position); jogadorRot.copy(g.rotation); cameraInfo.yaw = yawCamera(camera);
  });

  const velArmaRender = Math.max(0.6, arma?.velocidade ?? 1);
  const skinCor = skin?.includes('sombra') ? '#222' : skin?.includes('irmandade') ? '#f4f1ea' : undefined;
  const tintMont = mont?.id === 'cavalo_selvagem' ? '#8b6a46' : mont?.id === 'mula' ? '#6d6257' : mont?.id === 'jumento' ? '#8f877f' : mont?.id === 'corcel_lanterna' ? '#f1e6c8' : mont?.id === 'cavalo_guerra' ? '#4a4040' : undefined;

  return (
    <>
      <group ref={ref}>
        {mont && <Cavalo tint={tintMont} escala={mont.tipo === 'jumento' ? 0.75 : mont.tipo === 'mula' ? 0.88 : 1} galopando={galope} />}
        <Personagem3D arquivo={MODELOS_HEROI[heroiId]} anim={anim} gatilho={gatilho} velocidadeAnim={golpe.current > 0 ? 1.5 * velArmaRender : 1} arma={mont ? null : modeloArma(armaId, arma?.tipo)}
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
    if (usarPendente()) {
      if (indice !== null) {
        consumirUsar();
        const p = jogadorPos.clone().add(new THREE.Vector3(1.6, 0, 0)); p.y = altura(p.x, p.z);
        pos.current[indice].copy(p); setIndice(null); atualizar(() => ({ montado: null }));
      } else {
        let melhor = -1, menor = 3.2;
        pos.current.forEach((p, i) => { const d = p.distanceTo(jogadorPos); if (d < menor) { menor = d; melhor = i; } });
        if (melhor >= 0 && consumirUsar()) {
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
      let x = 0, z = 0; do { x = (Math.random() - 0.5) * 480; z = (Math.random() - 0.5) * 480; } while (Math.hypot(x, z) < 100 || altura(x, z) < 1.5 || altura(x, z) > 25);
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
  const animais = useAnimais(qualidade === 'baixo' ? 20 : 40);
  const patas = useRef<Record<number, (THREE.Group | null)[]>>({});
  const sol = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const relogioCla = useRef(0);
  // Qualidade automática: mede os quadros por segundo e baixa o gráfico se o jogo estiver lento
  const fps = useRef({ t: 0, n: 0, espera: 6, baixas: 0 });

  const alvoPerto = (p: THREE.Vector3, raio: number) => {
    let melhor: THREE.Vector3 | null = null, menor = raio;
    for (const a of animais) { if (a.vida <= 0) continue; const d = a.pos.distanceTo(p); if (d < menor) { menor = d; melhor = a.pos; } }
    for (const c of useBatalha.getState().combatentes) {
      if (c.lado !== 'inimigo' || c.vida <= 0) continue;
      const v = new THREE.Vector3(...c.pos); const d = v.distanceTo(p); if (d < menor) { menor = d; melhor = v; }
    }
    return melhor;
  };
  const atacar = (pos: THREE.Vector3, alcance: number, dano: number) => {
    let acertou = danoNoChefe(pos, alcance, dano);
    // guardas do Conselho nas batalhas do clã
    for (const c of useBatalha.getState().combatentes) {
      if (c.lado === 'inimigo' && c.vida > 0 && new THREE.Vector3(...c.pos).distanceTo(pos) < alcance + 0.8) { c.vida -= dano * 1.4; acertou = true; }
    }
    for (const a of animais) {
      if (a.vida <= 0 || a.pos.distanceTo(pos) > alcance + 0.8) continue;
      a.vida -= dano; acertou = true;
      if (a.vida <= 0) {
        animalAbatido(a.def.id);                                          // conta para as missões de caça
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
    if (acertou) tocar('acerto');
  };

  useFrame((_, dt) => {
    {
      const f = fps.current; f.t += dt; f.n++;
      if (f.t >= 3) {
        const media = f.n / f.t; f.t = 0; f.n = 0;
        if (f.espera > 0) f.espera -= 3;                                        // espera o mundo terminar de carregar
        else if (media < 26 && useJogo.getState().config.autoQualidade !== false) {
          const atual = useJogo.getState().config.qualidade, i = ORDEM.indexOf(atual);
          if (i > 0) { useJogo.getState().setConfig({ qualidade: ORDEM[i - 1] }); f.espera = 6; avisoQualidade(`Gráfico ajustado para ${ORDEM[i - 1].toUpperCase()} para ficar mais fluido (${Math.round(media)} FPS)`); }
        }
      }
    }
    dt = Math.min(dt, 0.05);
    relogioCla.current += dt; if (relogioCla.current > 1) { relogioCla.current = 0; verificarInvasao(); }
    atualizar((p) => {
      const hora = (p.horaDoDia + (24 / DURACAO_DIA) * dt) % 24;
      const novoDia = hora < p.horaDoDia;
      const fome = Math.max(0, p.fome - dt * 0.06), sede = Math.max(0, p.sede - dt * 0.09);
      const energia = Math.max(0, Math.min(100, p.energia + (entrada.correr && !p.montado ? -dt * 2 : dt * 1.2)));
      const vida = fome === 0 || sede === 0 ? Math.max(0, p.vida - dt * 0.5) : Math.min(100, p.vida + dt * 0.25);
      return { horaDoDia: hora, fome, sede, energia, vida, tempoJogado: p.tempoJogado + dt,
        diasSobrevividos: p.diasSobrevividos + (novoDia ? 1 : 0), posicao: posicaoParaSalvar() };
    });

    // sol / lua: luz forte e quente de dia, azulada e suave de noite (sem ficar tudo preto)
    const h = useJogo.getState().progresso?.horaDoDia ?? 12;
    const ang = ((h - 6) / 12) * Math.PI, elev = Math.sin(ang);
    const dia = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
    if (sol.current) {
      const ox = Math.cos(ang) * 60, oy = Math.max(Math.abs(elev), 0.35) * 70;
      sol.current.position.set(jogadorPos.x + (dia > 0.5 ? ox : -ox * 0.6), jogadorPos.y + oy, jogadorPos.z + 30);
      sol.current.target.position.copy(jogadorPos); sol.current.target.updateMatrixWorld();
      sol.current.intensity = THREE.MathUtils.lerp(0.9, elev < 0.3 ? 2.2 : 3.0, dia);
      sol.current.color.set(dia < 0.5 ? '#9fb4ff' : elev < 0.3 ? '#ffb070' : '#fff2dc');
    }
    if (hemi.current) { hemi.current.intensity = THREE.MathUtils.lerp(0.85, 0.9, dia); hemi.current.color.set(dia < 0.5 ? '#5a6fa8' : '#cfe3ff'); }

    // missão de caça: se não houver o animal pedido perto do local, um aparece por lá
    const mc = missaoAtual();
    if (mc?.tipo === 'cacar' && mc.animal) {
      const perto = animais.some((a) => a.def.id === mc.animal && a.vida > 0 && Math.hypot(a.pos.x - mc.local[0], a.pos.z - mc.local[1]) < 70);
      const livre = animais.find((a) => a.def.id === mc.animal);
      if (!perto && livre) { livre.vida = livre.def.vida; livre.pos.set(mc.local[0] + 12, 0, mc.local[1] + 8); livre.alvo.copy(livre.pos); }
    }
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
      <Suspense fallback={null}><Terreno segmentos={qualidade === 'baixo' ? 180 : qualidade === 'medio' ? 260 : 360} /></Suspense>
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
      <HistoriaMundo />
      <SomMundo />
      <FaroisClas />
      <Suspense fallback={null}><Fortaleza /></Suspense>
      <LogicaCasas />
      <Suspense fallback={null}><Interior /></Suspense>
      <Moradores quantidade={qualidade === 'baixo' ? 8 : 14} />
      <Suspense fallback={null}><Jogador onAtacar={atacar} alvoPerto={alvoPerto} /></Suspense>
    </>
  );
}

// Som do mundo: ambiente (mar, fogo, rio, pássaros, grilos), música e avisos (dano, missão, chefe, conversa).
function SomMundo() {
  const acum = useRef(0);
  useEffect(() => {
    prepararSom();
    definirVolume(useJogo.getState().config.volume);
    let vidaAnt = useJogo.getState().progresso?.vida ?? 100, ultDano = 0;
    const u1 = useJogo.subscribe((s) => {
      definirVolume(s.config.volume);
      const v = s.progresso?.vida ?? 100;
      if (v < vidaAnt - 0.5 && performance.now() - ultDano > 450) { ultDano = performance.now(); tocar(v <= 0 ? 'morte' : 'dano'); }
      vidaAnt = v;
    });
    let ant = useHistoria.getState();
    const u2 = useHistoria.subscribe((h) => {
      if (h.aviso && h.aviso !== ant.aviso && h.aviso.startsWith('✔')) tocar('missao');
      if (h.chefe && !ant.chefe) tocar('chefe');
      if (h.dialogo && (h.dialogo !== ant.dialogo || h.indiceFala !== ant.indiceFala)) tocar('fala');
      ant = h;
    });
    return () => { u1(); u2(); };
  }, []);
  useFrame((_, dt) => {
    acum.current += dt; if (acum.current < 0.25) return; acum.current = 0;
    const { x, z } = jogadorPos; const p = useJogo.getState().progresso;
    let distMar = 60;
    for (const r of [6, 15, 30, 50]) {
      let achou = false;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; if (altura(x + Math.cos(a) * r, z + Math.sin(a) * r) < ALTURA_AGUA - 1) { achou = true; break; } }
      if (achou) { distMar = r; break; }
    }
    if (altura(x, z) < ALTURA_AGUA) distMar = 0;
    const dentro = dentroDeCasa(); if (dentro) distMar = 999;
    let distFogo = 999;
    if ((p?.capitulo ?? 1) <= 1) for (const [fx, fz] of CASAS_EM_CHAMAS) distFogo = Math.min(distFogo, Math.hypot(fx - x, fz - z));
    const combate = useBatalha.getState().combatentes.some((c) => c.lado === 'inimigo' && c.vida > 0) || !!(useHistoria.getState().chefe?.vida);
    atualizarAmbiente({ distMar, distFogo, distRio: dentro ? 999 : distRio(x, z), hora: p?.horaDoDia ?? 12, combate, montado: !!p?.montado });
  });
  return null;
}

// Faróis coloridos nas ilhas dos clãs: dá para ver de longe para onde remar
function FaroisClas() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { ref.current?.children.forEach((c, i) => { const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; if (m) m.opacity = 0.32 + Math.sin(clock.elapsedTime * 1.5 + i) * 0.08; }); });
  return (
    <group ref={ref}>
      <mesh position={[LUGAR.fortaleza[0], 4 + 80, LUGAR.fortaleza[1] - 14]}>
        <cylinderGeometry args={[2, 6, 160, 12, 1, true]} />
        <meshBasicMaterial color="#ff1e1e" transparent opacity={0.35} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {ILHAS.filter((i) => i.cor).map((i) => (
        <mesh key={i.id} position={[i.centro[0], altura(i.centro[0], i.centro[1]) + 70, i.centro[1]]}>
          <cylinderGeometry args={[1.6, 4.5, 140, 12, 1, true]} />
          <meshBasicMaterial color={i.cor} transparent opacity={0.35} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
