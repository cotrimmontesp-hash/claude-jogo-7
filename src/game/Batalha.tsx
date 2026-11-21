// Batalha no mapa: seus guerreiros (faixa azul) lutam ao seu lado contra os guardas do Conselho (vermelho).
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { useBatalha, terminarBatalhaNoMapa, type Combatente } from './claLogica';
import { jogadorPos } from './Mundo';
import { entrada } from './input';
import { useJogo } from '../state/store';
import { Personagem3D, type Anim } from './Personagem3D';
import { altura } from './Terreno';
import { ARMAS } from '../data/items';

const MODELO: Record<string, { arq: string; arma: string; escudo?: boolean }> = {
  espadachim: { arq: 'npc/guarda', arma: 'armas/sword_1handed', escudo: true },
  machadeiro: { arq: 'herois/tome', arma: 'armas/axe_1handed', escudo: true },
  lanceiro: { arq: 'npc/guarda', arma: 'armas/sword_2handed' },
  arqueiro: { arq: 'npc/rogue', arma: 'armas/dagger' },
  batedor: { arq: 'herois/ines', arma: 'armas/dagger' },
  cavaleiro: { arq: 'npc/guarda', arma: 'armas/sword_1handed', escudo: true },
  guarda: { arq: 'npc/guarda', arma: 'armas/sword_1handed', escudo: true },
};

export function Batalha() {
  const { ativa, combatentes } = useBatalha();
  const refs = useRef<Record<string, THREE.Group | null>>({});
  const recarga = useRef<Record<string, number>>({});
  const anims = useRef<Record<string, Anim>>({});
  const [, forcar] = useState(0);
  const relogio = useRef(0);
  const golpeHeroi = useRef(0);
  const fim = useRef(false);

  useFrame((_, dt) => {
    if (!ativa || fim.current) return;
    dt = Math.min(dt, 0.05);
    const vivos = combatentes.filter((c) => c.vida > 0);
    const aliados = vivos.filter((c) => c.lado === 'aliado'), inimigos = vivos.filter((c) => c.lado === 'inimigo');
    const p = useJogo.getState().progresso;
    const dano = (ARMAS.find((a) => a.id === p?.equipado.arma)?.dano ?? 10) * 1.4;
    let mudou = false;
    const setAnim = (uid: string, a: Anim) => { if (anims.current[uid] !== a) { anims.current[uid] = a; mudou = true; } };

    golpeHeroi.current -= dt;
    if (entrada.atacar && golpeHeroi.current <= 0) {
      golpeHeroi.current = 0.55;
      inimigos.forEach((e) => { if (new THREE.Vector3(...e.pos).distanceTo(jogadorPos) < 2.4) { e.vida -= dano; setAnim(e.uid, 'Hit_A'); } });
    }

    for (const c of combatentes) {
      if (c.vida <= 0) { setAnim(c.uid, 'Death_A'); continue; }
      const rivais = c.lado === 'aliado' ? inimigos : aliados;
      const pos = new THREE.Vector3(...c.pos);
      let alvo: THREE.Vector3 | null = null, alvoC: Combatente | null = null, menor = Infinity;
      for (const r of rivais) { const d = pos.distanceTo(new THREE.Vector3(...r.pos)); if (d < menor) { menor = d; alvo = new THREE.Vector3(...r.pos); alvoC = r; } }
      if (c.lado === 'inimigo') { const dH = pos.distanceTo(jogadorPos); if (dH < menor) { menor = dH; alvo = jogadorPos.clone(); alvoC = null; } }
      if (!alvo && c.lado === 'aliado') { alvo = jogadorPos.clone().add(new THREE.Vector3(2, 0, 2)); menor = pos.distanceTo(alvo); }

      if (alvo && menor > 1.5) {
        pos.addScaledVector(alvo.clone().sub(pos).setY(0).normalize(), c.vel * dt);
        pos.y = altura(pos.x, pos.z); c.pos = pos.toArray() as [number, number, number];
        setAnim(c.uid, 'Running_A');
      } else if (alvo) {
        recarga.current[c.uid] = (recarga.current[c.uid] ?? Math.random()) - dt;
        if (recarga.current[c.uid] <= 0) {
          recarga.current[c.uid] = 1.1;
          setAnim(c.uid, Math.random() < 0.5 ? '1H_Melee_Attack_Slice_Diagonal' : '1H_Melee_Attack_Chop');
          if (alvoC) alvoC.vida -= c.dano;
          else useJogo.getState().atualizar((q) => ({ vida: Math.max(0, q.vida - c.dano * 0.45) }));
        } else if (recarga.current[c.uid] < 0.5) setAnim(c.uid, 'Block');
      }
      const g = refs.current[c.uid];
      if (g) { g.position.set(c.pos[0], altura(c.pos[0], c.pos[2]), c.pos[2]); if (alvo) g.rotation.y = Math.atan2(alvo.x - c.pos[0], alvo.z - c.pos[2]); }
    }
    relogio.current += dt;
    if (mudou && relogio.current > 0.12) { relogio.current = 0; forcar((n) => n + 1); }

    const heroiCaiu = (p?.vida ?? 1) <= 0;
    if (inimigos.length === 0 || heroiCaiu) {
      fim.current = true;
      if (heroiCaiu) useJogo.getState().atualizar(() => ({ vida: 40 }));
      setTimeout(() => { terminarBatalhaNoMapa(inimigos.length === 0); fim.current = false; anims.current = {}; }, 2500);
    }
  });

  if (!ativa) return null;
  return <>{combatentes.map((c) => {
    const m = MODELO[c.classe] ?? MODELO.guarda;
    return (
      <group key={c.uid} ref={(g) => { refs.current[c.uid] = g; }} position={c.pos}>
        <Personagem3D arquivo={m.arq} arma={m.arma} escudo={m.escudo} anim={anims.current[c.uid] ?? 'Idle'}
          cor={c.lado === 'inimigo' ? '#7a1c1c' : '#2f5fb8'} sombra={false} />
      </group>
    );
  })}</>;
}
