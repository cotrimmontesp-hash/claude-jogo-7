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
  | 'Block' | 'Hit_A' | 'Death_A' | 'Cheer' | 'Interact' | 'PickUp' | 'Sit_Floor_Idle' | 'Unarmed_Idle' | '2H_Melee_Idle'
  | 'Rolar' | 'Grito';

// ---------- Personagens realistas do Mixamo (montados no Blender) ----------
// Todos usam o mesmo esqueleto "mixamorig", então as 32 animações servem para qualquer um.
type Perfil = 'leve' | 'machado' | 'espada';
const MAPA_MIXAMO: Record<Perfil, Partial<Record<Anim, string>>> = {
  leve: { Idle: 'parado', Unarmed_Idle: 'parado', '2H_Melee_Idle': 'espada_parado', Walking_A: 'andar', Running_A: 'correr', Walking_C: 'furtivo',
    Jump_Full_Short: 'pular', Jump_Idle: 'caindo', '1H_Melee_Attack_Slice_Diagonal': 'golpe1', '1H_Melee_Attack_Chop': 'golpe2',
    '1H_Melee_Attack_Stab': 'golpe3', '2H_Melee_Attack_Slice': 'chute', Block: 'bloquear', Hit_A: 'dano', Death_A: 'morrer',
    Cheer: 'vitoria', Interact: 'agachado', PickUp: 'agachado', Sit_Floor_Idle: 'agachado', Rolar: 'rolar', Grito: 'grito' },
  machado: { Idle: 'machado_parado', Unarmed_Idle: 'parado', '2H_Melee_Idle': 'machado_parado', Walking_A: 'machado_andar', Running_A: 'machado_correr',
    Walking_C: 'furtivo', Jump_Full_Short: 'pular', Jump_Idle: 'caindo', '1H_Melee_Attack_Slice_Diagonal': 'machado2', '1H_Melee_Attack_Chop': 'machado1',
    '1H_Melee_Attack_Stab': 'machado_combo', '2H_Melee_Attack_Slice': 'machado_combo', Block: 'bloquear', Hit_A: 'machado_dano', Death_A: 'morrer',
    Cheer: 'grito', Interact: 'agachado', PickUp: 'agachado', Sit_Floor_Idle: 'agachado', Rolar: 'rolar', Grito: 'grito' },
  espada: { Idle: 'espada_parado', Unarmed_Idle: 'parado', '2H_Melee_Idle': 'espada_parado', Walking_A: 'espada_andar', Running_A: 'espada_correr',
    Walking_C: 'furtivo', Jump_Full_Short: 'espada_pular', Jump_Idle: 'caindo', '1H_Melee_Attack_Slice_Diagonal': 'golpe1', '1H_Melee_Attack_Chop': 'golpe2',
    '1H_Melee_Attack_Stab': 'golpe3', '2H_Melee_Attack_Slice': 'golpe3', Block: 'bloquear', Hit_A: 'dano', Death_A: 'morrer',
    Cheer: 'vitoria', Interact: 'agachado', PickUp: 'agachado', Sit_Floor_Idle: 'agachado', Rolar: 'rolar', Grito: 'grito' },
};
const PERFIL: Record<string, Perfil> = { 'mixamo/ines': 'leve', 'mixamo/tome': 'machado', 'mixamo/guarda': 'espada' };

// Converte as animações do Mixamo para os nomes do jogo e tira o deslocamento do quadril (anda no lugar)
function clipsMixamo(base: THREE.AnimationClip[], perfil: Perfil) {
  const porNome = Object.fromEntries(base.map((c) => [c.name, c]));
  return Object.entries(MAPA_MIXAMO[perfil]).flatMap(([nossa, deles]) => {
    const orig = porNome[deles!]; if (!orig) return [];
    const c = orig.clone(); c.name = nossa;
    c.tracks.forEach((t) => {
      if (/Hips\.position$/.test(t.name) && deles !== 'pular' && deles !== 'rolar' && deles !== 'caindo') {
        // no esqueleto do Mixamo o eixo 0 é o lado, o 1 é a frente e o 2 é a altura:
        // trava lado e frente (o jogo é que move o personagem) e mantém o balanço da altura
        const v = t.values; const x0 = v[0], y0 = v[1];
        for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 1] = y0; }
      }
    });
    return [c];
  });
}

interface Props {
  arquivo: string;                    // ex.: 'herois/ines'
  anim?: Anim;
  arma?: string | null;               // ex.: 'armas/sword_1handed'
  escudo?: boolean;
  escala?: number;
  posicao?: [number, number, number];
  rotacao?: number;
  velocidadeAnim?: number;
  gatilho?: number;                   // muda a cada golpe: reinicia a animação mesmo se for a mesma
  sombra?: boolean;
  cor?: string;                       // tom extra (skins simples / time)
}

export const Personagem3D = forwardRef<THREE.Group, Props>(function Personagem3D(
  { arquivo, anim = 'Idle', arma, escudo, escala = ESCALA.personagem, posicao, rotacao = 0, velocidadeAnim = 1, gatilho = 0, sombra = true, cor }, ref) {
  const { scene, animations: animsProprias } = useGLTF(modelo(arquivo));
  const animsMixamo = useGLTF(modelo('mixamo/animacoes')).animations;
  const ehMixamo = arquivo.startsWith('mixamo/');
  const animations = useMemo(() => (ehMixamo ? clipsMixamo(animsMixamo, PERFIL[arquivo] ?? 'leve') : animsProprias), [ehMixamo, animsMixamo, animsProprias, arquivo]);
  const escalaFinal = ehMixamo ? (escala === ESCALA.personagem ? 1 : escala / ESCALA.personagem) : escala;
  const armaGltf = useGLTF(modelo(arma ?? 'armas/dagger'));
  const escudoGltf = useGLTF(modelo('armas/shield_round'));

  // cada personagem precisa da própria cópia do esqueleto
  const copia = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group;
    c.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = sombra; o.receiveShadow = true; o.frustumCulled = false;
        if (OBJETOS_DO_MODELO.test(o.name)) o.visible = false;
        if (cor && o.material) {
          const tingir = (m: any) => { const n = m.clone(); if (n.color) n.color = new THREE.Color(cor).lerp(n.color, 0.55); return n; };
          o.material = Array.isArray(o.material) ? o.material.map(tingir) : tingir(o.material);
        }
      }
    });
    return c;
  }, [scene, sombra, cor]);

  // arma e escudo nas mãos
  useEffect(() => {
    const mao = copia.getObjectByName('handslotr') ?? copia.getObjectByName('handslot.r') ?? copia.getObjectByName('mixamorigRightHand');
    const maoE = copia.getObjectByName('handslotl') ?? copia.getObjectByName('handslot.l') ?? copia.getObjectByName('mixamorigLeftHand');
    const extras: THREE.Object3D[] = [];
    // no Mixamo o osso da mão está em centímetros (esqueleto em escala 0,01): a arma precisa ser ajustada
    const ajustar = (o: THREE.Object3D, esquerda: boolean) => {
      if (!ehMixamo) return;
      o.scale.setScalar(52);
      o.position.set(esquerda ? 2 : -2, 9, 3);
      o.rotation.set(Math.PI / 2, 0, esquerda ? -Math.PI / 2 : Math.PI / 2);
    };
    if (mao && arma) { const a = armaGltf.scene.clone(); a.traverse((o: any) => o.isMesh && (o.castShadow = true)); ajustar(a, false); mao.add(a); extras.push(a); }
    if (maoE && escudo) { const e = escudoGltf.scene.clone(); ajustar(e, true); e.scale.multiplyScalar(0.9); maoE.add(e); extras.push(e); }
    return () => extras.forEach((x) => x.parent?.remove(x));
  }, [copia, arma, escudo, armaGltf.scene, escudoGltf.scene]);

  const grupo = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, grupo);
  const atual = useRef<string | null>(null);

  useEffect(() => {
    const nova = actions[anim] ?? actions.Idle;
    if (!nova) return;
    const velha = atual.current ? actions[atual.current] : null;
    const umaVez = /Attack|Jump_Full|Hit|Death|PickUp|Interact|Cheer|Rolar|Grito/.test(anim);
    nova.reset();
    nova.setLoop(umaVez ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    nova.clampWhenFinished = /Death/.test(anim);
    nova.timeScale = velocidadeAnim;
    const ataque = /Attack/.test(anim);
    nova.fadeIn(ataque ? 0.08 : 0.18).play();
    if (velha && velha !== nova) velha.fadeOut(ataque ? 0.08 : 0.18);
    atual.current = anim;
  }, [anim, actions, velocidadeAnim, gatilho]);

  return (
    <group ref={ref} position={posicao} rotation={[0, rotacao, 0]}>
      <group ref={grupo} scale={escalaFinal}>
        <primitive object={copia} />
      </group>
    </group>
  );
});

useGLTF.preload(modelo('mixamo/ines'));
useGLTF.preload(modelo('mixamo/tome'));
useGLTF.preload(modelo('mixamo/animacoes'));
useGLTF.preload(modelo('armas/dagger'));
useGLTF.preload(modelo('armas/shield_round'));
