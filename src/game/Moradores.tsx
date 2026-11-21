// Moradores andando por Vila Rica (e alguns na ilha do clã) + canoas nos cais para viajar entre as ilhas.
import React, { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { altura } from './Terreno';
import { jogadorPos } from './Mundo';
import { entrada } from './input';
import { Personagem3D, type Anim } from './Personagem3D';
import { useHistoria } from './historia';
import { useViagem } from './teleporte';
import { ILHAS, LUGAR } from './mapa';

const NOMES = ['Seu Bento', 'Dona Rosa', 'Zé Pedro', 'Luzia', 'Seu Firmino', 'Dona Isabel', 'Raimundo', 'Benedita', 'Antônio', 'Margarida', 'Severino', 'Conceição', 'Damiana', 'Chico'];
const FALAS = [
  'Dizem que o Conselho de Ferro cobra o quinto do ouro e ainda leva o resto.',
  'Cuidado na mata depois que escurece, moça. A Onça Negra anda por lá.',
  'Meu irmão trabalha nas minas. Faz semanas que não vejo ele...',
  'O ferreiro Joaquim faz as melhores lâminas de Vila Rica. Leva couro e osso pra ele.',
  'Ouvi falar de uma Irmandade que protege o povo. Seria verdade?',
  'Os guardas do quartel batem em quem não paga imposto.',
  'Do cais do sul sai canoa para as ilhas. Mas as ilhas dos clãs são perigosas!',
  'A igreja foi construída com o ouro que nossos avós tiraram da serra.',
  'Se você caçar uma capivara, dá pra fazer um bom gibão de couro.',
  'Já viu o pôr do sol lá da serra? Vale a subida.',
];
const ROUPAS = ['#7a5230', '#5a6b3a', '#8a3a2a', '#3a4a6a', '#9a8a6a', '#6a3a5a', '#4a4a4a'];

interface Morador { nome: string; arq: string; cor: string; pos: THREE.Vector3; alvo: THREE.Vector3; espera: number; centro: [number, number]; raio: number }

function UmMorador({ m, onFalar }: { m: Morador; onFalar: (m: Morador) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<Anim>('Walking_A');
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    dt = Math.min(dt, 0.05);
    const perto = m.pos.distanceTo(jogadorPos) < 3;
    let novo: Anim = 'Idle';
    if (perto) g.rotation.y = Math.atan2(jogadorPos.x - m.pos.x, jogadorPos.z - m.pos.z);       // para e olha para você
    else if (m.espera > 0) m.espera -= dt;
    else {
      const d = m.alvo.clone().sub(m.pos).setY(0);
      if (d.length() < 0.8) {                                                                       // escolhe outro lugar para ir
        const a = Math.random() * Math.PI * 2, r = Math.random() * m.raio;
        m.alvo.set(m.centro[0] + Math.cos(a) * r, 0, m.centro[1] + Math.sin(a) * r); m.espera = 1 + Math.random() * 5;
      } else { m.pos.addScaledVector(d.normalize(), 1.25 * dt); g.rotation.y = Math.atan2(d.x, d.z); novo = 'Walking_A'; }
    }
    m.pos.y = altura(m.pos.x, m.pos.z); g.position.copy(m.pos);
    if (novo !== anim) setAnim(novo);
  });
  return <group ref={ref}><Personagem3D arquivo={m.arq} anim={anim} cor={m.cor} sombra={false} /></group>;
}

function Canoa({ pos, rot }: { pos: [number, number, number]; rot: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.2, 0]} scale={[0.75, 0.35, 3]} castShadow><sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#5a3a22" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.4, 0.45, 0.6]} rotation={[0.3, 0, 0.9]}><cylinderGeometry args={[0.04, 0.04, 2.2]} /><meshStandardMaterial color="#8a6a42" /></mesh>
      <pointLight color="#ffd36b" intensity={6} distance={7} position={[0, 2, 0]} />
    </group>
  );
}

export function Moradores({ quantidade = 14 }: { quantidade?: number }) {
  const moradores = useMemo<Morador[]>(() => Array.from({ length: quantidade }, (_, i) => {
    const naIlha = i >= quantidade - 3;                                // alguns moram no Refúgio do clã
    const centro: [number, number] = naIlha ? ILHAS[1].centro : i % 5 === 4 ? LUGAR.aldeia : LUGAR.vila;
    const raio = naIlha ? 18 : 70;
    const a = i * 2.4, r = 10 + (i % 6) * 8;
    const x = centro[0] + Math.cos(a) * r, z = centro[1] + Math.sin(a) * r;
    return { nome: NOMES[i % NOMES.length], arq: i % 2 ? 'mixamo/tome' : 'mixamo/ines', cor: ROUPAS[i % ROUPAS.length],
      pos: new THREE.Vector3(x, altura(x, z), z), alvo: new THREE.Vector3(x, 0, z), espera: Math.random() * 3, centro, raio };
  }), [quantidade]);
  const apertou = useRef(false);
  const viagem = useViagem;

  useFrame(() => {
    const clique = entrada.interagir && !apertou.current; apertou.current = entrada.interagir;
    if (!clique || useHistoria.getState().dialogo || viagem.getState().aberto) return;
    // canoa: perto de um cais abre o menu de viagem
    for (const il of ILHAS) {
      if (Math.hypot(jogadorPos.x - il.cais[0], jogadorPos.z - il.cais[1]) < 9) { viagem.getState().abrir(il.id); return; }
    }
    // conversa com o morador mais perto
    let perto: Morador | null = null, menor = 3;
    for (const m of moradores) { const d = m.pos.distanceTo(jogadorPos); if (d < menor) { menor = d; perto = m; } }
    if (perto) useHistoria.getState().abrirDialogo([{ quem: perto.nome, texto: FALAS[(Math.floor(Date.now() / 1000) + perto.nome.length) % FALAS.length] }]);
  });

  return (
    <>
      <Suspense fallback={null}>{moradores.map((m, i) => <UmMorador key={i} m={m} onFalar={() => {}} />)}</Suspense>
      {ILHAS.map((il) => {
        const ang = Math.atan2(il.cais[0] - il.centro[0], il.cais[1] - il.centro[1]);
        return <Canoa key={il.id} pos={[il.cais[0] + Math.sin(ang) * 7, -1.0, il.cais[1] + Math.cos(ang) * 7]} rot={ang} />;
      })}
    </>
  );
}
