// Celular: céu físico e neblina. Pós-efeitos pesados ficam desligados para manter 30–60 FPS.
import React from 'react';
import { Sky } from '@react-three/drei/native';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';

export function Graficos() {
  const q = PRESETS[useJogo((s) => s.config.qualidade)];
  const hora = useJogo((s) => s.progresso?.horaDoDia ?? 12);
  const ang = ((hora - 6) / 12) * Math.PI;
  return (
    <>
      <Sky sunPosition={[Math.cos(ang) * 100, Math.sin(ang) * 100, 30]} turbidity={6} rayleigh={1.5} />
      <hemisphereLight args={['#cfe0ff', '#4a3a28', 0.6]} />
      <fog attach="fog" args={['#a9b8c8', q.distancia * 0.3, q.distancia]} />
    </>
  );
}
