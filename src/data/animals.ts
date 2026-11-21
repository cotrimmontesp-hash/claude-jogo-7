import type { Material } from './items';

export type Comportamento = 'foge' | 'neutro' | 'agressivo';

export interface Animal {
  id: string; nome: string; vida: number; dano: number; velocidade: number;
  comportamento: Comportamento;
  regiao: string[];           // capítulos/regiões onde aparece
  drops: { material: Material; min: number; max: number; chance: number }[];
  carne: number;              // quanto recupera de fome
  modelo: string;
}

export const ANIMAIS: Animal[] = [
  { id: 'capivara', nome: 'Capivara', vida: 30, dano: 0, velocidade: 3, comportamento: 'foge', regiao: ['mata', 'rio'],
    drops: [{ material: 'couro', min: 1, max: 2, chance: 1 }], carne: 30, modelo: 'animais/capivara.glb' },
  { id: 'veado', nome: 'Veado-Campeiro', vida: 40, dano: 0, velocidade: 7, comportamento: 'foge', regiao: ['mata', 'serra'],
    drops: [{ material: 'couro', min: 2, max: 3, chance: 1 }, { material: 'chifre', min: 1, max: 1, chance: 0.3 }], carne: 40, modelo: 'animais/veado.glb' },
  { id: 'arara', nome: 'Arara', vida: 10, dano: 0, velocidade: 8, comportamento: 'foge', regiao: ['mata'],
    drops: [{ material: 'pena', min: 2, max: 4, chance: 1 }], carne: 5, modelo: 'animais/arara.glb' },
  { id: 'queixada', nome: 'Queixada', vida: 70, dano: 12, velocidade: 6, comportamento: 'agressivo', regiao: ['mata', 'serra'],
    drops: [{ material: 'couro_grosso', min: 1, max: 2, chance: 1 }, { material: 'presa', min: 1, max: 2, chance: 0.8 }], carne: 50, modelo: 'animais/queixada.glb' },
  { id: 'lobo_guara', nome: 'Lobo-Guará', vida: 60, dano: 10, velocidade: 8, comportamento: 'neutro', regiao: ['serra', 'campo'],
    drops: [{ material: 'couro', min: 2, max: 3, chance: 1 }, { material: 'garra', min: 1, max: 2, chance: 0.6 }], carne: 30, modelo: 'animais/lobo_guara.glb' },
  { id: 'jacare', nome: 'Jacaré-de-Papo-Amarelo', vida: 120, dano: 22, velocidade: 4, comportamento: 'agressivo', regiao: ['rio', 'pantano'],
    drops: [{ material: 'escama', min: 2, max: 4, chance: 1 }, { material: 'osso', min: 1, max: 3, chance: 1 }], carne: 60, modelo: 'animais/jacare.glb' },
  { id: 'onca', nome: 'Onça-Pintada', vida: 160, dano: 30, velocidade: 9, comportamento: 'agressivo', regiao: ['mata', 'pantano'],
    drops: [{ material: 'pele_onca', min: 1, max: 1, chance: 1 }, { material: 'garra', min: 2, max: 4, chance: 1 }, { material: 'presa', min: 1, max: 2, chance: 1 }], carne: 50, modelo: 'animais/onca.glb' },
  { id: 'harpia', nome: 'Gavião-Real', vida: 50, dano: 15, velocidade: 12, comportamento: 'neutro', regiao: ['serra'],
    drops: [{ material: 'pena', min: 4, max: 6, chance: 1 }, { material: 'garra', min: 1, max: 2, chance: 0.7 }], carne: 10, modelo: 'animais/harpia.glb' },
  // Lendários (chefes de caça, 1 por região)
  { id: 'onca_negra', nome: 'Onça Negra Lendária', vida: 600, dano: 45, velocidade: 10, comportamento: 'agressivo', regiao: ['mata'],
    drops: [{ material: 'pele_onca', min: 3, max: 3, chance: 1 }, { material: 'ouro', min: 2, max: 3, chance: 1 }], carne: 80, modelo: 'animais/onca_negra.glb' },
  { id: 'jacare_ancestral', nome: 'Jacaré Ancestral', vida: 900, dano: 55, velocidade: 5, comportamento: 'agressivo', regiao: ['pantano'],
    drops: [{ material: 'escama', min: 8, max: 10, chance: 1 }, { material: 'chifre', min: 2, max: 2, chance: 1 }], carne: 100, modelo: 'animais/jacare_ancestral.glb' },
];
