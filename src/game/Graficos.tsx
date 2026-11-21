// PC / PWA: céu físico, luz de ambiente (HDR), e pós-efeitos cinematográficos
// (bloom, oclusão de ambiente, correção de cor, vinheta) para chegar perto de um visual realista.
import React from 'react';
import { Sky, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, Vignette, ToneMapping, SMAA, HueSaturation, BrightnessContrast } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';
import { corNeblina } from './ceu';

export function Graficos() {
  const q = PRESETS[useJogo((s) => s.config.qualidade)];
  const hora = useJogo((s) => Math.round((s.progresso?.horaDoDia ?? 12) * 4) / 4); // atualiza a cada 15 min do jogo
  const ang = ((hora - 6) / 12) * Math.PI;
  const sol: [number, number, number] = [Math.cos(ang) * 100, Math.sin(ang) * 100, 30];
  return (
    <>
      <Sky sunPosition={sol} turbidity={6} rayleigh={1.5} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <Environment preset={hora > 19 || hora < 5 ? 'night' : 'sunset'} environmentIntensity={hora > 19 || hora < 5 ? 0.25 : 0.45} />
      {(hora > 18.5 || hora < 5.5) && <Stars radius={180} depth={40} count={2500} factor={5} saturation={0.2} fade speed={0.5} />}
      <fog attach="fog" args={[corNeblina(hora), q.distancia * 0.35, q.distancia]} />
      {q.posEfeitos && (
        <EffectComposer multisampling={0}>
          {q.ssao ? <N8AO aoRadius={1.5} intensity={2} /> : <></>}
          <Bloom intensity={0.7} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <HueSaturation saturation={0.18} />
          <BrightnessContrast brightness={0.02} contrast={0.12} />
          <Vignette offset={0.3} darkness={0.55} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}
