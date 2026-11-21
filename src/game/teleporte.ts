// Pedidos de teleporte (canoa entre ilhas, invasões) e menu de viagem.
import * as THREE from 'three';
import { create } from 'zustand';
import { ILHAS } from './mapa';
import { altura } from './Terreno';

export const pedidoTeleporte: { alvo: THREE.Vector3 | null } = { alvo: null };

// ponto em terra firme perto do cais de uma ilha (um pouco para dentro da ilha)
export function pontoDoCais(ilhaId: string) {
  const il = ILHAS.find((i) => i.id === ilhaId)!;
  const [cx, cz] = il.cais, [ix, iz] = il.centro;
  for (let k = 0.05; k < 0.6; k += 0.03) {
    const x = cx + (ix - cx) * k, z = cz + (iz - cz) * k;
    if (altura(x, z) > 0.8) return new THREE.Vector3(x, altura(x, z), z);
  }
  return new THREE.Vector3(ix, altura(ix, iz), iz);
}

export function teleportar(v: THREE.Vector3) { pedidoTeleporte.alvo = v.clone(); }

interface EstadoViagem { aberto: boolean; origem: string | null; viajando: string | null; abrir: (origem: string) => void; fechar: () => void; viajar: (destino: string) => void }
export const useViagem = create<EstadoViagem>((set) => ({
  aberto: false, origem: null, viajando: null,
  abrir: (origem) => set({ aberto: true, origem }),
  fechar: () => set({ aberto: false }),
  viajar: (destino) => {
    const il = ILHAS.find((i) => i.id === destino)!;
    set({ aberto: false, viajando: il.nome });
    setTimeout(() => { teleportar(pontoDoCais(destino)); }, 1400);       // "remando..."
    setTimeout(() => set({ viajando: null }), 2600);
  },
}));
