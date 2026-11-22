// Fortaleza do Chefão no meio da ilha central: muralhas com ameias, quatro torres, portão e o torreão.
// É aqui que mora o Governador de Ferro, o chefe mais difícil do jogo.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from './drei';
import { textura } from './modelos';
import { LUGAR } from './mapa';
import { ALTURA_FORTALEZA } from './Terreno';

export const FX = LUGAR.fortaleza[0], FZ = LUGAR.fortaleza[1];
const LADO = 64, ESP = 2.4, ALT = 11, PORTAO = 9;
/** Onde o chefão espera (em frente ao torreão) */
export const TRONO: [number, number] = [FX, FZ - 8];

// paredes que bloqueiam o jogador (caixas alinhadas: centro x/z e meia-largura)
const PAREDES: [number, number, number, number][] = (() => {
  const h = LADO / 2, s = (LADO - PORTAO) / 4;
  return [
    [FX, FZ - h, h, ESP / 2],                                  // norte
    [FX - h, FZ, ESP / 2, h], [FX + h, FZ, ESP / 2, h],         // oeste / leste
    [FX - h + s, FZ + h, s, ESP / 2], [FX + h - s, FZ + h, s, ESP / 2],   // sul, com o portão no meio
    [FX, FZ - 14, 10, 8],                                      // torreão
  ];
})();
export function colidirFortaleza(p: THREE.Vector3) {
  if (Math.abs(p.x - FX) > LADO / 2 + 6 || Math.abs(p.z - FZ) > LADO / 2 + 6) return;
  for (const [cx, cz, hx, hz] of PAREDES) {
    const dx = p.x - cx, dz = p.z - cz, ex = hx + 0.45 - Math.abs(dx), ez = hz + 0.45 - Math.abs(dz);
    if (ex > 0 && ez > 0) { if (ex < ez) p.x += Math.sign(dx) * ex; else p.z += Math.sign(dz) * ez; }
  }
}

const URLS = { pedra: textura('casa/pedra_cor.jpg'), pedraN: textura('casa/pedra_nor.jpg'), telha: textura('casa/telha_cor.jpg'), madeira: textura('casa/madeira_cor.jpg') };

export function Fortaleza() {
  const tex = useTexture(URLS) as unknown as Record<string, THREE.Texture>;
  const m = useMemo(() => {
    const rep = (t: THREE.Texture, x: number, y: number, cor = false) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); if (cor) c.colorSpace = THREE.SRGBColorSpace; c.needsUpdate = true; return c; };
    return {
      muro: new THREE.MeshStandardMaterial({ map: rep(tex.pedra, 14, 3, true), normalMap: rep(tex.pedraN, 14, 3), color: '#8d8478', roughness: 0.95 }),
      torre: new THREE.MeshStandardMaterial({ map: rep(tex.pedra, 6, 4, true), normalMap: rep(tex.pedraN, 6, 4), color: '#7d746a', roughness: 0.95 }),
      telhado: new THREE.MeshStandardMaterial({ map: rep(tex.telha, 4, 4, true), color: '#5a2a22', roughness: 0.8 }),
      madeira: new THREE.MeshStandardMaterial({ map: rep(tex.madeira, 1, 2, true), color: '#3a2618', roughness: 0.8 }),
      bandeira: new THREE.MeshStandardMaterial({ color: '#7a1414', roughness: 1, side: THREE.DoubleSide }),
      tocha: new THREE.MeshStandardMaterial({ color: '#2a1408', emissive: new THREE.Color('#ff7a1e'), emissiveIntensity: 2.2 }),
      chao: new THREE.MeshStandardMaterial({ map: rep(tex.pedra, 18, 18, true), color: '#a59b8c', roughness: 0.95 }),
      ferro: new THREE.MeshStandardMaterial({ color: '#222226', metalness: 0.8, roughness: 0.4 }),
    };
  }, [tex]);
  const y = ALTURA_FORTALEZA, h = LADO / 2, s = (LADO - PORTAO) / 4;
  const ameias = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = -h; i <= h; i += 2.4) { out.push([i, -h, 0]); out.push([i, -h, 1]); out.push([i, h, 1]); if (Math.abs(i) > PORTAO / 2 + 1) out.push([i, h, 0]); }
    return out;
  }, []);
  return (
    <group position={[FX, y, FZ]}>
      {/* pátio de pedra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={m.chao} receiveShadow><planeGeometry args={[LADO, LADO]} /></mesh>
      {/* muralhas */}
      <mesh position={[0, ALT / 2, -h]} material={m.muro} castShadow receiveShadow><boxGeometry args={[LADO + ESP, ALT, ESP]} /></mesh>
      <mesh position={[-h, ALT / 2, 0]} material={m.muro} castShadow receiveShadow><boxGeometry args={[ESP, ALT, LADO]} /></mesh>
      <mesh position={[h, ALT / 2, 0]} material={m.muro} castShadow receiveShadow><boxGeometry args={[ESP, ALT, LADO]} /></mesh>
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * (h - s), ALT / 2, h]} material={m.muro} castShadow receiveShadow><boxGeometry args={[s * 2, ALT, ESP]} /></mesh>)}
      {/* ameias no alto das muralhas */}
      {ameias.map(([a, b, ori], i) => (
        <mesh key={i} position={ori ? [b, ALT + 0.6, a] : [a, ALT + 0.6, b]} material={m.muro} castShadow><boxGeometry args={ori ? [ESP, 1.2, 1.2] : [1.2, 1.2, ESP]} /></mesh>
      ))}
      {/* portão: arco e grade levadiça erguida */}
      <mesh position={[0, ALT - 1.6, h]} material={m.muro} castShadow><boxGeometry args={[PORTAO + 0.2, 3.2, ESP + 0.6]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-PORTAO / 2 + 0.6 + i * 1.12, ALT - 2.2, h + 0.4]} material={m.ferro}><boxGeometry args={[0.14, 3.4, 0.14]} /></mesh>)}
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * (PORTAO / 2 + 1.4), 2.6, h + 1.6]} material={m.tocha}><boxGeometry args={[0.35, 0.5, 0.35]} /></mesh>)}
      {/* torres nos cantos */}
      {[[-h, -h], [h, -h], [-h, h], [h, h]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 8, 0]} material={m.torre} castShadow receiveShadow><cylinderGeometry args={[4, 4.6, 16, 18]} /></mesh>
        <mesh position={[0, 16.4, 0]} material={m.torre} castShadow><cylinderGeometry args={[4.6, 4.6, 1, 18]} /></mesh>
        <mesh position={[0, 20, 0]} material={m.telhado} castShadow><coneGeometry args={[5, 6.5, 18]} /></mesh>
        <mesh position={[0, 25.2, 0]} material={m.ferro}><cylinderGeometry args={[0.07, 0.07, 3]} /></mesh>
        <mesh position={[0.9, 25.8, 0]} material={m.bandeira}><planeGeometry args={[1.8, 1.1]} /></mesh>
        {[0, 1, 2].map((k) => <mesh key={k} position={[Math.cos(k * 2.1) * 4.05, 9 + k * 2.2, Math.sin(k * 2.1) * 4.05]} rotation={[0, -k * 2.1, 0]}><boxGeometry args={[0.2, 1.1, 0.5]} /><meshStandardMaterial color="#0d0d0f" /></mesh>)}
      </group>)}
      {/* torreão do Governador */}
      <group position={[0, 0, -14]}>
        <mesh position={[0, 9, 0]} material={m.torre} castShadow receiveShadow><boxGeometry args={[20, 18, 16]} /></mesh>
        <mesh position={[0, 18.6, 0]} material={m.muro}><boxGeometry args={[21, 1.2, 17]} /></mesh>
        <mesh position={[0, 23.5, 0]} rotation={[0, Math.PI / 4, 0]} material={m.telhado} castShadow><coneGeometry args={[14.5, 9, 4]} /></mesh>
        <mesh position={[0, 3.2, 8.05]} material={m.madeira}><boxGeometry args={[4.2, 6.4, 0.3]} /></mesh>
        {[-6, 6].map((x) => <mesh key={x} position={[x, 7, 8.2]} material={m.bandeira}><planeGeometry args={[2.4, 9]} /></mesh>)}
        {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 3.2, 3.5, 8.6]} material={m.tocha}><boxGeometry args={[0.35, 0.5, 0.35]} /></mesh>)}
        {[-7, -2.4, 2.4, 7].map((x) => <mesh key={x} position={[x, 12.5, 8.05]}><boxGeometry args={[1.2, 2.4, 0.1]} /><meshStandardMaterial color="#120a06" emissive="#ff8a2e" emissiveIntensity={0.6} /></mesh>)}
      </group>
      {/* trono no pátio, onde o chefão espera */}
      <group position={[0, 0, TRONO[1] - FZ]}>
        <mesh position={[0, 0.4, -1]} material={m.muro}><boxGeometry args={[6, 0.8, 4]} /></mesh>
        <mesh position={[0, 1.6, -2.2]} material={m.madeira}><boxGeometry args={[1.6, 1.6, 1]} /></mesh>
        <mesh position={[0, 3, -2.6]} material={m.bandeira}><boxGeometry args={[1.6, 2.4, 0.2]} /></mesh>
      </group>
    </group>
  );
}
