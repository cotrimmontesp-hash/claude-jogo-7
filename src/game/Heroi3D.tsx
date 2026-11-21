// Herói em 3D. Enquanto os modelos do Blender (assets/models/herois/*.glb) não chegam,
// usa uma figura provisória com as cores de cada personagem.
import React, { forwardRef } from 'react';
import type { Group } from 'three';

const CORES = { ines: { capa: '#e9e2d0', faixa: '#a3242b' }, tome: { capa: '#3d4a5c', faixa: '#c98a2b' } };

export const Heroi3D = forwardRef<Group, { heroi: 'ines' | 'tome'; posicao?: [number, number, number]; rotacao?: number }>(
  ({ heroi, posicao = [0, 0, 0], rotacao = 0 }, ref) => {
    const c = CORES[heroi];
    const alt = heroi === 'tome' ? 1.08 : 1;
    return (
      <group ref={ref} position={posicao} rotation={[0, rotacao, 0]} scale={alt}>
        {/* corpo/capa */}
        <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.22, 0.38, 1.1, 10]} /><meshStandardMaterial color={c.capa} /></mesh>
        {/* faixa na cintura */}
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.3, 0.3, 0.1, 10]} /><meshStandardMaterial color={c.faixa} /></mesh>
        {/* cabeça com capuz pontudo */}
        <mesh position={[0, 1.45, 0]} castShadow><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#c99a72" /></mesh>
        <mesh position={[0, 1.55, -0.02]}><coneGeometry args={[0.26, 0.45, 10]} /><meshStandardMaterial color={c.capa} /></mesh>
        {/* lâmina na mão */}
        <mesh position={[0.32, 0.8, 0.15]} rotation={[0.4, 0, 0]}><boxGeometry args={[0.04, 0.6, 0.08]} /><meshStandardMaterial color="#cfd4da" metalness={0.8} roughness={0.3} /></mesh>
      </group>
    );
  });
