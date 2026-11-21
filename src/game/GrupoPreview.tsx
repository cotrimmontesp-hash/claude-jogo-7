// Grupo de até 5 heróis lado a lado no lobby (modelos animados); vagas vazias mostram "+".
import React, { Suspense } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Canvas } from './r3f';
import { Personagem3D } from './Personagem3D';
import { MODELOS_HEROI } from './modelos';
import type { MembroSala } from '../net/client';

const POS_X = [0, -1.7, 1.7, -3.3, 3.3];

function Fogueira() {
  return (
    <group position={[0, 0, 1.6]}>
      <pointLight color="#ff8a3a" intensity={25} distance={9} decay={1.5} position={[0, 0.8, 0]} />
      <mesh position={[0, 0.25, 0]}><coneGeometry args={[0.25, 0.7, 7]} /><meshBasicMaterial color="#ffb347" toneMapped={false} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.05, 0]} rotation={[0, i * 1.05, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.9, 6]} /><meshStandardMaterial color="#4a2f1a" /></mesh>)}
    </group>
  );
}

export function GrupoPreview({ membros, onVagaLivre }: { membros: Pick<MembroSala, 'id' | 'heroi' | 'nome'>[]; onVagaLivre: () => void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas shadows camera={{ position: [0, 2.1, 7.5], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 1.1, 0)}>
        <color attach="background" args={['#1b130c']} />
        <fog attach="fog" args={['#1b130c', 9, 20]} />
        <hemisphereLight args={['#ffe2b8', '#2a1d12', 0.7]} />
        <directionalLight position={[3, 7, 5]} intensity={2.2} castShadow color="#ffe0b0" />
        <directionalLight position={[-4, 3, -5]} intensity={1.2} color="#7fa8ff" />
        <Suspense fallback={null}>
          {membros.slice(0, 5).map((m, i) => (
            <Personagem3D key={m.id} arquivo={MODELOS_HEROI[m.heroi]} posicao={[POS_X[i], 0, Math.abs(POS_X[i]) * -0.25]} rotacao={-POS_X[i] * 0.08}
              anim={i === 0 ? 'Idle' : '2H_Melee_Idle'} arma={m.heroi === 'tome' ? 'armas/axe_1handed' : 'armas/dagger'} escudo={m.heroi === 'tome'} />
          ))}
        </Suspense>
        <Fogueira />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[9, 48]} /><meshStandardMaterial color="#3b2a1a" roughness={1} /></mesh>
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {POS_X.map((x, i) => i >= membros.length && (
          <Pressable key={i} onPress={onVagaLivre} style={[s.mais, { left: `${50 + x * 9.5}%` }]}><Text style={s.maisTxt}>+</Text></Pressable>
        ))}
        {membros.map((m, i) => <Text key={m.id} style={[s.nome, { left: `${50 + POS_X[i] * 9.5}%` }]}>{m.nome}</Text>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  mais: { position: 'absolute', top: '45%', marginLeft: -26, width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#e8b64a', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0006' },
  maisTxt: { color: '#e8b64a', fontSize: 28, fontWeight: '900' },
  nome: { position: 'absolute', top: '20%', width: 120, marginLeft: -60, textAlign: 'center', color: '#f3eadb', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
});
