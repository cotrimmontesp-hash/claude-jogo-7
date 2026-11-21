// PC / navegador: céu físico, névoa de horizonte, raios de sol (god rays) e pós-efeitos de cinema.
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { Sky, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, Vignette, ToneMapping, SMAA, HueSaturation, BrightnessContrast, GodRays } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import { useFrame } from './r3f';
import { useJogo } from '../state/store';
import { PRESETS } from './qualidade';
import { corNeblina } from './ceu';

const direcaoSol = (h: number) => { const a = ((h - 6) / 12) * Math.PI; return new THREE.Vector3(Math.cos(a), Math.max(Math.sin(a), 0.04), 0.35).normalize(); };

// "disco" do sol que acompanha a câmera — fonte dos raios de luz
function DiscoSol({ setRef }: { setRef: (m: THREE.Mesh | null) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    const h = useJogo.getState().progresso?.horaDoDia ?? 12;
    if (ref.current) { ref.current.position.copy(camera.position).addScaledVector(direcaoSol(h), 260); ref.current.visible = h > 5.6 && h < 18.6; }
  });
  return (
    <mesh ref={(m) => { (ref as any).current = m; setRef(m); }}>
      <sphereGeometry args={[9, 20, 20]} />
      <meshBasicMaterial color="#ffd9a0" fog={false} toneMapped={false} transparent />
    </mesh>
  );
}

export function Graficos() {
  const qualidade = useJogo((s) => s.config.qualidade);
  const q = PRESETS[qualidade];
  const hora = useJogo((s) => Math.round((s.progresso?.horaDoDia ?? 12) * 4) / 4); // atualiza a cada 15 min do jogo
  const noite = hora > 19 || hora < 5;
  const sol = direcaoSol(hora).multiplyScalar(100);
  const [disco, setDisco] = useState<THREE.Mesh | null>(null);
  const raios = (qualidade === 'alto' || qualidade === 'ultra') && !noite;
  // névoa exponencial: perto fica nítido, o horizonte some numa neblina dourada/azulada
  const densidade = qualidade === 'baixo' ? 0.0085 : 0.0058;

  return (
    <>
      <Sky sunPosition={[sol.x, sol.y, sol.z]} turbidity={hora > 15.5 || hora < 8 ? 9 : 5} rayleigh={hora > 15.5 || hora < 8 ? 2.6 : 1.4} mieCoefficient={0.007} mieDirectionalG={0.88} />
      <Environment preset={noite ? 'night' : 'sunset'} environmentIntensity={noite ? 0.25 : 0.5} />
      {(hora > 18.5 || hora < 5.5) && <Stars radius={180} depth={40} count={2500} factor={5} saturation={0.2} fade speed={0.5} />}
      <fogExp2 attach="fog" args={[corNeblina(hora), densidade]} />
      {raios && <DiscoSol setRef={setDisco} />}
      {q.posEfeitos && (
        <EffectComposer multisampling={0}>
          {q.ssao ? <N8AO aoRadius={1.5} intensity={2} /> : <></>}
          {raios && disco ? <GodRays sun={disco} samples={qualidade === 'ultra' ? 60 : 36} density={0.94} decay={0.93} weight={0.35} exposure={0.45} clampMax={1} blur blendFunction={BlendFunction.SCREEN} /> : <></>}
          <Bloom intensity={0.7} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <HueSaturation saturation={-0.08} />
          <BrightnessContrast brightness={0.02} contrast={0.14} />
          <Vignette offset={0.3} darkness={0.5} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}
