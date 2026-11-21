// Personagem animado (modelos KayKit, CC0): troca de animação suave e arma na mão.
import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGLTF, useAnimations } from './drei';
import { modelo, ESCALA } from './modelos';

// Armas/objetos que já vêm presos no modelo: escondemos todos e colocamos a arma do jogo na mão.
const OBJETOS_DO_MODELO = /Knife|Crossbow|Throwable|Axe|Shield|Sword|Mug|Staff|Wand|Spellbook/i;

export type Anim =
  | 'Idle' | 'Walking_A' | 'Running_A' | 'Jump_Full_Short' | 'Jump_Idle' | 'Walking_C'
  | '1H_Melee_Attack_Slice_Diagonal' | '1H_Melee_Attack_Chop' | '1H_Melee_Attack_Stab' | '2H_Melee_Attack_Slice'
  | 'Block' | 'Hit_A' | 'Death_A' | 'Cheer' | 'Interact' | 'PickUp' | 'Sit_Floor_Idle' | 'Unarmed_Idle' | '2H_Melee_Idle';

interface Props {
  arquivo: string;                    // ex.: 'herois/ines'
  anim?: Anim;
  arma?: string | null;               // ex.: 'armas/sword_1handed'
  escudo?: boolean;
  escala?: number;
  posicao?: [number, number, number];
  rotacao?: number;
  velocidadeAnim?: number;
  sombra?: boolean;
  cor?: string;                       // tom extra (skins simples / time)
}

export const Personagem3D = forwardRef<THREE.Group, Props>(function Personagem3D(
  { arquivo, anim = 'Idle', arma, escudo, escala = ESCALA.personagem, posicao, rotacao = 0, velocidadeAnim = 1, sombra = true, cor }, ref) {
  const { scene, animations } = useGLTF(modelo(arquivo));
  const armaGltf = useGLTF(modelo(arma ?? 'armas/dagger'));
  const escudoGltf = useGLTF(modelo('armas/shield_round'));

  // cada personagem precisa da própria cópia do esqueleto
  const copia = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group;
    c.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = sombra; o.receiveShadow = true; o.frustumCulled = false;
        if (OBJETOS_DO_MODELO.test(o.name)) o.visible = false;
        if (cor && o.material) { o.material = o.material.clone(); o.material.color = new THREE.Color(cor).lerp(o.material.color, 0.55); }
      }
    });
    return c;
  }, [scene, sombra, cor]);

  // arma e escudo nas mãos
  useEffect(() => {
    const mao = copia.getObjectByName('handslotr') ?? copia.getObjectByName('handslot.r');
    const maoE = copia.getObjectByName('handslotl') ?? copia.getObjectByName('handslot.l');
    const extras: THREE.Object3D[] = [];
    if (mao && arma) { const a = armaGltf.scene.clone(); a.traverse((o: any) => o.isMesh && (o.castShadow = true)); mao.add(a); extras.push(a); }
    if (maoE && escudo) { const e = escudoGltf.scene.clone(); maoE.add(e); extras.push(e); }
    return () => extras.forEach((x) => x.parent?.remove(x));
  }, [copia, arma, escudo, armaGltf.scene, escudoGltf.scene]);

  const grupo = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, grupo);
  const atual = useRef<string | null>(null);

  useEffect(() => {
    const nova = actions[anim] ?? actions.Idle;
    if (!nova) return;
    const velha = atual.current ? actions[atual.current] : null;
    const umaVez = /Attack|Jump_Full|Hit|Death|PickUp|Interact|Cheer/.test(anim);
    nova.reset();
    nova.setLoop(umaVez ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    nova.clampWhenFinished = /Death/.test(anim);
    nova.timeScale = velocidadeAnim;
    nova.fadeIn(0.18).play();
    if (velha && velha !== nova) velha.fadeOut(0.18);
    atual.current = anim;
  }, [anim, actions, velocidadeAnim]);

  return (
    <group ref={ref} position={posicao} rotation={[0, rotacao, 0]}>
      <group ref={grupo} scale={escala}>
        <primitive object={copia} />
      </group>
    </group>
  );
});

useGLTF.preload(modelo('herois/ines'));
useGLTF.preload(modelo('herois/tome'));
useGLTF.preload(modelo('armas/dagger'));
useGLTF.preload(modelo('armas/shield_round'));
