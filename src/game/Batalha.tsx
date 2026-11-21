// Batalha no mapa: seus guerreiros lutam ao seu lado contra os guardas do Conselho.
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { useBatalha, terminarBatalhaNoMapa, type Combatente } from './claLogica';
import { jogadorPos } from './Mundo';
import { entrada } from './input';
import { useJogo } from '../state/store';

const COR: Record<string, string> = { espadachim: '#e9e2d0', machadeiro: '#7a5a3a', lanceiro: '#c9b27a', arqueiro: '#4f6b34', batedor: '#2b2b2b', cavaleiro: '#9aa3ad', guarda: '#8a1e1e' };

function Soldado({ c, refCb }: { c: Combatente; refCb: (g: THREE.Group | null) => void }) {
  return (
    <group ref={refCb} position={c.pos}>
      <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.22, 0.32, 1.1, 8]} /><meshStandardMaterial color={COR[c.classe]} /></mesh>
      <mesh position={[0, 1.42, 0]}><sphereGeometry args={[0.19, 10, 10]} /><meshStandardMaterial color={c.lado === 'inimigo' ? '#5a5a5a' : '#c99a72'} /></mesh>
      {/* faixa: azul aliado / vermelha inimigo */}
      <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.27, 0.27, 0.08, 8]} /><meshStandardMaterial color={c.lado === 'aliado' ? '#3a8ad6' : '#b8342a'} emissive={c.lado === 'aliado' ? '#123a66' : '#4a0f0b'} /></mesh>
    </group>
  );
}

export function Batalha() {
  const { ativa, combatentes } = useBatalha();
  const refs = useRef<Record<string, THREE.Group | null>>({});
  const recarga = useRef<Record<string, number>>({});
  const golpeHeroi = useRef(0);
  const fim = useRef(false);

  useFrame((_, dt) => {
    if (!ativa || fim.current) return;
    const vivos = combatentes.filter((c) => c.vida > 0);
    const aliados = vivos.filter((c) => c.lado === 'aliado'), inimigos = vivos.filter((c) => c.lado === 'inimigo');
    const dano = useJogo.getState().progresso?.equipado.arma ? 22 : 12;

    // herói ataca guardas próximos
    golpeHeroi.current -= dt;
    if (entrada.atacar && golpeHeroi.current <= 0) {
      golpeHeroi.current = 0.5;
      inimigos.forEach((e) => { if (new THREE.Vector3(...e.pos).distanceTo(jogadorPos) < 2) e.vida -= dano; });
    }

    for (const c of vivos) {
      // alvo: inimigo mais próximo (inimigos também miram no herói)
      const rivais = c.lado === 'aliado' ? inimigos : aliados;
      let alvo: THREE.Vector3 | null = null, alvoC: Combatente | null = null, menor = Infinity;
      const pos = new THREE.Vector3(...c.pos);
      for (const r of rivais) { const d = pos.distanceTo(new THREE.Vector3(...r.pos)); if (d < menor) { menor = d; alvo = new THREE.Vector3(...r.pos); alvoC = r; } }
      if (c.lado === 'inimigo') { const dH = pos.distanceTo(jogadorPos); if (dH < menor) { menor = dH; alvo = jogadorPos.clone(); alvoC = null; } }
      if (!alvo && c.lado === 'aliado') { alvo = jogadorPos.clone().add(new THREE.Vector3(1.5, 0, 1.5)); menor = pos.distanceTo(alvo); } // segue o herói

      if (alvo && menor > 1.3) {
        pos.addScaledVector(alvo.clone().sub(pos).setY(0).normalize(), c.vel * dt); c.pos = pos.toArray() as any;
      } else if (alvo && (alvoC || c.lado === 'inimigo')) {
        recarga.current[c.uid] = (recarga.current[c.uid] ?? 0) - dt;
        if (recarga.current[c.uid] <= 0) {
          recarga.current[c.uid] = 1;
          if (alvoC) alvoC.vida -= c.dano;
          else useJogo.getState().atualizar((p) => ({ vida: Math.max(0, p.vida - c.dano * 0.5) }));
        }
      }
      const g = refs.current[c.uid];
      if (g) { g.position.set(c.pos[0], 0, c.pos[2]); if (alvo) g.lookAt(alvo.x, 0, alvo.z); }
    }
    combatentes.forEach((c) => { const g = refs.current[c.uid]; if (g) g.visible = c.vida > 0; });

    const heroiCaiu = (useJogo.getState().progresso?.vida ?? 1) <= 0;
    if (inimigos.length === 0 || heroiCaiu) {
      fim.current = true;
      const venceu = inimigos.length === 0;
      if (heroiCaiu) useJogo.getState().atualizar(() => ({ vida: 40 }));   // herói é resgatado pelos aliados
      setTimeout(() => { terminarBatalhaNoMapa(venceu); fim.current = false; }, 1500);
    }
  });

  if (!ativa) return null;
  return <>{combatentes.map((c) => <Soldado key={c.uid} c={c} refCb={(g) => { refs.current[c.uid] = g; }} />)}</>;
}
