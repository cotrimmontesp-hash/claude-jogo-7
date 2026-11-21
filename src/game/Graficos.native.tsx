// Celular: céu físico e neblina. Pós-efeitos pesados ficam desligados para manter 30–60 FPS.
import React from 'react';
import { Sky, Stars } from '@react-three/drei/native';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';
import { corNeblina } from './ceu';

export function Graficos() {
  const q = PRESETS[useJogo((s) => s.config.qualidade)];
  const hora = useJogo((s) => Math.round((s.progresso?.horaDoDia ?? 12) * 4) / 4); // atualiza a cada 15 min do jogo
  const ang = ((hora - 6) / 12) * Math.PI;
  return (
    <>
      <Sky sunPosition={[Math.cos(ang) * 100, Math.sin(ang) * 100, 30]} turbidity={6} rayleigh={1.5} />
      <hemisphereLight args={['#cfe0ff', '#4a3a28', 0.6]} />
      {(hora > 18.5 || hora < 5.5) && <Stars radius={180} depth={40} count={1500} factor={5} fade />}
      <fogExp2 attach="fog" args={[corNeblina(hora), 0.0075]} />
    </>
  );
}
