// Grupo de até 5 heróis lado a lado no lobby; vagas vazias mostram um "+".
import React, { useRef } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Canvas, useFrame } from './r3f';
import { Heroi3D } from './Heroi3D';
import type { Group } from 'three';
import type { MembroSala } from '../net/client';

const POS_X = [0, -1.6, 1.6, -3.1, 3.1]; // líder no centro

function Girando({ heroi, x }: { heroi: 'ines' | 'tome'; x: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y = Math.sin(Date.now() / 1500 + x) * 0.25; });
  return <Heroi3D ref={ref} heroi={heroi} posicao={[x, 0, 0]} />;
}

export function GrupoPreview({ membros, onVagaLivre }: { membros: Pick<MembroSala, 'id' | 'heroi' | 'nome'>[]; onVagaLivre: () => void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas shadows camera={{ position: [0, 1.6, 6.5], fov: 45 }}>
        <color attach="background" args={['#1a120b']} />
        <fog attach="fog" args={['#1a120b', 8, 18]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 6, 4]} intensity={1.4} castShadow color="#ffd9a0" />
        <pointLight position={[0, 2.5, 2]} intensity={6} color="#ff9a3c" distance={8} />
        {membros.slice(0, 5).map((m, i) => <Girando key={m.id} heroi={m.heroi} x={POS_X[i]} />)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[8, 40]} /><meshStandardMaterial color="#3b2a1a" /></mesh>
      </Canvas>
      {/* vagas "+" por cima do 3D */}
      <View style={s.vagas} pointerEvents="box-none">
        {POS_X.map((x, i) => i >= membros.length && (
          <Pressable key={i} onPress={onVagaLivre} style={[s.mais, { left: `${50 + x * 9.5}%` }]}>
            <Text style={s.maisTxt}>+</Text>
          </Pressable>
        ))}
        {membros.map((m, i) => (
          <Text key={m.id} style={[s.nome, { left: `${50 + POS_X[i] * 9.5}%` }]}>{m.nome}</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  vagas: { ...StyleSheet.absoluteFillObject },
  mais: { position: 'absolute', top: '45%', marginLeft: -26, width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#e8b64a', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0006' },
  maisTxt: { color: '#e8b64a', fontSize: 28, fontWeight: '900' },
  nome: { position: 'absolute', top: '24%', width: 120, marginLeft: -60, textAlign: 'center', color: '#f3eadb', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
});
