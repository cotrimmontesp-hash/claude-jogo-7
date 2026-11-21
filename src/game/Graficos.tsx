// PC / PWA: céu físico, luz de ambiente (HDR), e pós-efeitos cinematográficos
// (bloom, oclusão de ambiente, correção de cor, vinheta) para chegar perto de um visual realista.
import React from 'react';
import { Sky, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';

export function Graficos() {
  const q = PRESETS[useJogo((s) => s.config.qualidade)];
  const hora = useJogo((s) => s.progresso?.horaDoDia ?? 12);
  const ang = ((hora - 6) / 12) * Math.PI;
  const sol: [number, number, number] = [Math.cos(ang) * 100, Math.sin(ang) * 100, 30];
  return (
    <>
      <Sky sunPosition={sol} turbidity={6} rayleigh={1.5} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <Environment preset={hora > 18 || hora < 6 ? 'night' : 'park'} environmentIntensity={0.6} />
      <fog attach="fog" args={['#a9b8c8', q.distancia * 0.3, q.distancia]} />
      {q.posEfeitos && (
        <EffectComposer multisampling={0}>
          {q.ssao ? <N8AO aoRadius={1.5} intensity={2} /> : <></>}
          <Bloom intensity={0.5} luminanceThreshold={0.85} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.3} darkness={0.55} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}
