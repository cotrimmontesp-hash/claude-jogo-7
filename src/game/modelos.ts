// Endereço dos modelos 3D (pasta public/models, publicada na Vercel).
import { Platform } from 'react-native';

const BASE = Platform.OS === 'web' ? '' : 'https://claude-jogo-7.vercel.app';
export const modelo = (nome: string) => `${BASE}/models/${nome}.glb`;
export const textura = (nome: string) => `${BASE}/tex/${nome}`;

// Tamanho de referência dos pacotes (personagens ~2,6 de altura; cenário em blocos de ~1)
export const ESCALA = {
  personagem: 0.68,   // ~1,8 m
  cenario: 6,         // casas de ~5–7 m
  arvore: 9,
  montanha: 40,
  pedra: 7,
  objeto: 5,
  cavalo: 0.0095,
  ave: 0.006,
};

export const MODELOS_HEROI = { ines: 'mixamo/ines', tome: 'mixamo/tome' } as const;   // realistas (Mixamo + Blender)

// Arma equipada -> modelo que vai na mão direita
export function modeloArma(armaId: string, tipo?: string) {
  if (/montante|alabarda/.test(armaId)) return 'armas/sword_2handed';
  if (/machado_duplo|machado_osso|machado_trovao|martelo/.test(armaId)) return 'armas/axe_2handed';
  if (tipo === 'machado' || tipo === 'maca') return 'armas/axe_1handed';
  if (tipo === 'adaga' || tipo === 'lamina_oculta' || armaId === 'faca') return 'armas/dagger';
  return 'armas/sword_1handed';
}
