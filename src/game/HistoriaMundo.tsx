// O que a história coloca no mundo: marcador do objetivo, itens para coletar, personagens para conversar,
// inimigos da missão e chefes (Onça Negra, Feitor-Mor, Jacaré Ancestral, Grão-Conselheiro).
import React, { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { altura } from './Terreno';
import { jogadorPos } from './Mundo';
import { entrada, usarPendente } from './input';
import { Personagem3D, type Anim } from './Personagem3D';
import { missaoAtual, useHistoria, iniciarMissaoSeNecessario, concluirMissao, CHEFAO, type Missao, type ChefeDef } from './historia';
import { TRONO } from './Fortaleza';
import { tocar } from './som';
import { useBatalha } from './claLogica';
import { useJogo } from '../state/store';

// posição do chefe (o Mundo usa para aplicar o dano do jogador)
export const chefePos = new THREE.Vector3(1e9, 0, 0);
export function danoNoChefe(pos: THREE.Vector3, alcance: number, dano: number) {
  const c = useHistoria.getState().chefe; if (!c || c.vida <= 0) return false;
  if (chefePos.distanceTo(pos) < alcance + 1.2 * c.def.escala) {
    const vida = c.vida - dano; useHistoria.setState({ chefe: { ...c, vida } });
    if (vida <= 0) setTimeout(c.livre ? venceuChefao : concluirMissao, 1200);
    return true;
  }
  return false;
}

// Vitória contra o Chefão fora da história: a melhor arma e armadura do jogo
function venceuChefao() {
  useJogo.getState().atualizar((p) => {
    const armas = p.armas.some((a) => a.id === 'espada_lanterna') ? p.armas : [...p.armas, { id: 'espada_lanterna', nivel: 0 }];
    const ids = ['cabeca', 'peito', 'bracos', 'pernas'].map((s) => `lanterna_${s}`);
    const armaduras = [...p.armaduras, ...ids.filter((id) => !p.armaduras.some((a) => a.id === id)).map((id) => ({ id, nivel: 0 }))];
    return { armas, armaduras, equipado: { arma: 'espada_lanterna', cabeca: ids[0], peito: ids[1], bracos: ids[2], pernas: ids[3] },
      materiais: { ...p.materiais, ouro: (p.materiais.ouro ?? 0) + 40 }, escolhas: { ...p.escolhas, chefao: 'derrotado' } };
  });
  useHistoria.setState({ chefe: null, aviso: '✔ Você derrotou o CHEFÃO! Ganhou a Lâmina da Lanterna, a Armadura da Lanterna e 40 de ouro.' });
  setTimeout(() => useHistoria.setState({ aviso: '' }), 7000);
}

const pontosColeta = (m: Missao) => Array.from({ length: m.quantidade ?? 1 }, (_, i) => {
  const a = (i / (m.quantidade ?? 1)) * Math.PI * 2 + 0.7, d = (m.raio ?? 20) * (0.35 + ((i * 37) % 10) / 20);
  const x = m.local[0] + Math.cos(a) * d, z = m.local[1] + Math.sin(a) * d;
  return new THREE.Vector3(x, altura(x, z), z);
});

// Coluna de luz dourada que mostra para onde ir
function Marcador({ pos, cor = '#ffd36b' }: { pos: THREE.Vector3; cor?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 0.8; (ref.current.children[1] as THREE.Mesh).position.y = 2 + Math.sin(clock.elapsedTime * 2) * 0.4; } });
  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, 30, 0]}><cylinderGeometry args={[0.6, 1.4, 60, 12, 1, true]} /><meshBasicMaterial color={cor} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></mesh>
      <mesh position={[0, 2, 0]}><octahedronGeometry args={[0.55]} /><meshBasicMaterial color={cor} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}><ringGeometry args={[2.2, 2.6, 32]} /><meshBasicMaterial color={cor} transparent opacity={0.6} toneMapped={false} /></mesh>
    </group>
  );
}

function Lenha({ pos }: { pos: THREE.Vector3 }) {
  return (
    <group position={pos}>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.15 + i * 0.12, 0]} rotation={[0, i * 0.9, Math.PI / 2]} castShadow><cylinderGeometry args={[0.08, 0.09, 1.1, 6]} /><meshStandardMaterial color="#6b4a2b" roughness={1} emissive="#5a3a10" emissiveIntensity={0.5} /></mesh>)}
    </group>
  );
}

// Chefe animal (onça/jacaré) ou humano
function Chefe({ def, inicio }: { def: ChefeDef; inicio: [number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<Anim>('Idle');
  const recarga = useRef(1), giro = useRef(7);
  const pos = useRef(new THREE.Vector3(inicio[0], altura(inicio[0], inicio[1]), inicio[1]));
  useFrame((_, dt) => {
    const c = useHistoria.getState().chefe; const g = ref.current; if (!c || !g) return;
    dt = Math.min(dt, 0.05);
    if (c.vida <= 0) { if (anim !== 'Death_A') setAnim('Death_A'); g.scale.y = def.tipo === 'humano' ? 1 : Math.max(0.2, g.scale.y - dt); return; }
    const d = pos.current.distanceTo(jogadorPos);
    const furia = def.chefao && c.vida < def.vida * 0.5;                  // o Chefão fica mais rápido com metade da vida
    const vel = (def.tipo === 'jacare' ? 3 : def.tipo === 'onca' ? 6.5 : 3.6) * (furia ? 1.45 : def.chefao ? 1.15 : 1);
    let novo: Anim = 'Idle';
    if (def.chefao) {                                                    // golpe giratório: atinge tudo em volta
      giro.current -= dt;
      if (giro.current < 0.8 && giro.current > 0) { novo = '2H_Melee_Attack_Slice' as Anim; if (novo !== anim) setAnim(novo); }
      if (giro.current <= 0) {
        giro.current = furia ? 4.5 : 7; tocar('espadaForte');
        if (d < 5.5) useJogo.getState().atualizar((p) => ({ vida: Math.max(0, p.vida - def.dano * 0.9 * (p.equipado.peito ? 0.75 : 1)) }));
      }
      if (giro.current < 0.8) { pos.current.y = altura(pos.current.x, pos.current.z); g.position.copy(pos.current); chefePos.copy(pos.current); return; }
    }
    if (d > 2.2 * def.escala * 0.8 && d < 45) {
      const dir = jogadorPos.clone().sub(pos.current).setY(0).normalize();
      pos.current.addScaledVector(dir, vel * dt); novo = 'Running_A';
    } else if (d <= 2.2 * def.escala * 0.8) {
      recarga.current -= dt; novo = recarga.current < 0.4 ? '1H_Melee_Attack_Chop' : 'Block';
      if (recarga.current <= 0) { recarga.current = def.chefao ? (furia ? 0.85 : 1.1) : 1.4; useJogo.getState().atualizar((p) => ({ vida: Math.max(0, p.vida - def.dano * (p.equipado.peito ? 0.7 : 1)) })); }
    }
    pos.current.y = altura(pos.current.x, pos.current.z);
    g.position.copy(pos.current); g.rotation.y = Math.atan2(jogadorPos.x - pos.current.x, jogadorPos.z - pos.current.z);
    chefePos.copy(pos.current);
    if (novo !== anim) setAnim(novo);
    // se o jogador cair, ele é "resgatado" com parte da vida e o chefe recupera um pouco
    if ((useJogo.getState().progresso?.vida ?? 1) <= 0) { useJogo.getState().atualizar(() => ({ vida: 50 })); useHistoria.setState({ chefe: { ...c, vida: Math.min(def.vida, c.vida + def.vida * 0.25) } }); }
  });
  if (def.tipo === 'humano') return <group ref={ref}><Personagem3D arquivo="mixamo/guarda" anim={anim} arma="armas/sword_2handed" escala={0.68 * def.escala} cor={def.chefao ? '#1a1a22' : '#2a1414'} />
    {def.chefao && <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[4.6, 5.5, 40]} /><meshBasicMaterial color="#ff2a2a" transparent opacity={0.35} toneMapped={false} /></mesh>}</group>;
  const cor = def.tipo === 'onca' ? '#141414' : '#3d4a2a';
  return (
    <group ref={ref}>
      <group scale={def.escala}>
        <mesh position={[0, 0.55, 0]} castShadow scale={def.tipo === 'jacare' ? [0.6, 0.3, 2.4] : [0.45, 0.5, 1.4]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={cor} roughness={0.7} /></mesh>
        <mesh position={[0, 0.75, def.tipo === 'jacare' ? 2.4 : 1.35]} castShadow scale={def.tipo === 'jacare' ? [0.35, 0.22, 0.8] : [0.32, 0.3, 0.42]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={cor} /></mesh>
        {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 0.88, def.tipo === 'jacare' ? 2.9 : 1.68]}><sphereGeometry args={[0.05, 8, 6]} /><meshBasicMaterial color="#ffcf2e" toneMapped={false} /></mesh>)}
        {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => <mesh key={i} position={[sx * 0.3, 0.25, sz * (def.tipo === 'jacare' ? 1.1 : 0.8)]}><cylinderGeometry args={[0.09, 0.07, 0.5, 6]} /><meshStandardMaterial color={cor} /></mesh>)}
        <mesh position={[0, 0.5, def.tipo === 'jacare' ? -2.6 : -1.6]} rotation={[-1.2, 0, 0]}><coneGeometry args={[0.15, 1.2, 6]} /><meshStandardMaterial color={cor} /></mesh>
      </group>
    </group>
  );
}

// NPC da história para conversar
const MODELO_NPC: Record<string, { arq: string; cor?: string }> = {
  'Seu Damião': { arq: 'mixamo/tome', cor: '#6b5a3a' }, 'Ferreiro Joaquim': { arq: 'mixamo/tome', cor: '#4a3a2a' },
  'Mestre Aurélio': { arq: 'mixamo/tome', cor: '#e8e2d0' }, 'Dona Benedita': { arq: 'mixamo/ines', cor: '#8a5a3a' },
};
function NpcHistoria({ m }: { m: Missao }) {
  const pos = useMemo(() => new THREE.Vector3(m.local[0], altura(m.local[0], m.local[1]), m.local[1]), [m]);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = Math.atan2(jogadorPos.x - pos.x, jogadorPos.z - pos.z); });
  const mod = MODELO_NPC[m.npc ?? ''] ?? { arq: 'mixamo/tome' };
  return <group ref={ref} position={pos}><Personagem3D arquivo={mod.arq} anim="Idle" cor={mod.cor} /></group>;
}

export function HistoriaMundo() {
  const capitulo = useJogo((s) => s.progresso?.capitulo ?? 1);
  const missao = useJogo((s) => s.progresso?.missao ?? 1);
  const modo = useJogo((s) => s.progresso?.modo ?? 'historia_solo');
  const coletados = useHistoria((s) => s.coletados);
  const chefe = useHistoria((s) => s.chefe);
  const m = useMemo(() => missaoAtual(), [capitulo, missao]);
  const pontos = useMemo(() => (m?.tipo === 'coletar' ? pontosColeta(m) : []), [m]);
  const apertou = useRef(false);
  const esperandoFala = useRef(false);

  useFrame(() => {
    // Chefão da Fortaleza: dá para desafiar a qualquer hora (é o mais difícil do jogo)
    const hc = useHistoria.getState();
    if (!hc.chefe && !(m?.tipo === 'chefe' && m.chefe?.chefao) && Math.hypot(jogadorPos.x - TRONO[0], jogadorPos.z - TRONO[1]) < 24) {
      const der = useJogo.getState().progresso?.escolhas?.chefao === 'derrotado';
      useHistoria.setState({ chefe: { def: der ? { ...CHEFAO, vida: CHEFAO.vida * 1.3, dano: CHEFAO.dano * 1.15 } : CHEFAO, vida: CHEFAO.vida * (der ? 1.3 : 1), pos: TRONO, livre: true } });
      hc.abrirDialogo([{ quem: 'Governador de Ferro', texto: der ? 'Voltou? Desta vez eu não caio.' : 'Quem ousa entrar na minha fortaleza? Esta ilha é minha. Ajoelhe-se ou morra!' }]);
    }
    if (hc.chefe?.livre && Math.hypot(jogadorPos.x - TRONO[0], jogadorPos.z - TRONO[1]) > 90) useHistoria.setState({ chefe: null });   // fugiu: o chefão volta ao trono
    if (!m || !modo.startsWith('historia')) return;
    iniciarMissaoSeNecessario();
    const h = useHistoria.getState();
    const clique = usarPendente();
    const alvo = new THREE.Vector3(m.local[0], 0, m.local[1]);
    const dist = Math.hypot(jogadorPos.x - alvo.x, jogadorPos.z - alvo.z);
    // chegou na luz: a missão de ir / pegar conta na hora, mesmo com a conversa aberta
    const fecharFala = () => { if (h.dialogo) useHistoria.setState({ dialogo: null, indiceFala: 0 }); };
    if (m.tipo === 'ir' && dist < Math.max(9, m.raio ?? 10)) { fecharFala(); concluirMissao(); return; }
    if (m.tipo === 'coletar') {
      pontos.forEach((p, i) => {
        if (!h.coletados.includes(i) && Math.hypot(p.x - jogadorPos.x, p.z - jogadorPos.z) < 3.2) {
          const c = [...useHistoria.getState().coletados, i]; useHistoria.setState({ coletados: c, contagem: c.length });
          if (c.length >= pontos.length) { fecharFala(); concluirMissao(); }
        }
      });
      return;
    }
    if (m.tipo === 'falar' && !esperandoFala.current && dist < 4.5) { esperandoFala.current = true; h.abrirDialogo(m.antes ?? [{ quem: m.npc ?? '', texto: '...' }]); return; }
    if (h.dialogo) return;                                     // espera terminar a conversa
    if (esperandoFala.current) { esperandoFala.current = false; concluirMissao(); return; }
    switch (m.tipo) {
      case 'coletar':
        if (clique) pontos.forEach((p, i) => {
          if (!h.coletados.includes(i) && p.distanceTo(jogadorPos) < 3) {
            const c = [...h.coletados, i]; useHistoria.setState({ coletados: c, contagem: c.length });
            if (c.length >= pontos.length) concluirMissao();
          }
        });
        break;
      case 'falar': if (dist < 3.5 && clique) { h.abrirDialogo(m.antes ?? [{ quem: m.npc ?? '', texto: '...' }]); esperandoFala.current = true; } break;
      case 'derrotar': {
        const b = useBatalha.getState();
        if (!b.ativa && dist < (m.raio ?? 16) * 2 && h.contagem === 0) {
          useHistoria.setState({ contagem: -1 });               // -1 = luta em andamento
          b.iniciar('missao' as any, m.inimigos ?? 3, 40 + capitulo * 12, [], undefined, [m.local[0], m.local[1]]);
        }
        break;
      }
      case 'chefe':
        if ((!h.chefe || h.chefe.livre) && dist < (m.raio ?? 30)) { useHistoria.setState({ chefe: { def: m.chefe!, vida: m.chefe!.vida, pos: m.local } }); if (m.antes) h.abrirDialogo(m.antes); }
        break;
    }
  });

  const chefeEl = chefe && <Suspense fallback={null}><Chefe key={`${chefe.def.nome}-${chefe.pos.join(',')}-${chefe.livre ? 'l' : 'm'}`} def={chefe.def} inicio={chefe.pos} /></Suspense>;
  if (!m || !modo.startsWith('historia')) return <>{chefeEl}</>;
  const alvo = new THREE.Vector3(m.local[0], altura(m.local[0], m.local[1]), m.local[1]);
  return (
    <>
      {m.tipo === 'coletar'
        ? pontos.map((p, i) => !coletados.includes(i) && <group key={i}><Lenha pos={p} /><Marcador pos={p} cor="#9be15d" /></group>)
        : !(m.tipo === 'chefe' && chefe) && <Marcador pos={alvo} />}
      {m.tipo === 'falar' && <Suspense fallback={null}><NpcHistoria m={m} /></Suspense>}
      {chefeEl}
    </>
  );
}
