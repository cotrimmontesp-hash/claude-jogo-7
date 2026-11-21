// Locomoção da época (1789): só animais e veículos puxados por animais ou a remo. Nada motorizado.
import type { Material } from './items';

export interface Montaria {
  id: string; nome: string; tipo: 'cavalo' | 'mula' | 'jumento' | 'boi' | 'carroca' | 'canoa';
  velocidade: number;   // m/s a galope / velocidade máxima
  folego: number;       // tempo de galope (s) antes de cansar
  carga: number;        // espaço extra de inventário
  passageiros: number;  // quantos jogadores levam juntos (co-op)
  vida: number;
  comoConseguir: string;
  terreno: 'terra' | 'agua';
  modelo: string;
}

export const MONTARIAS: Montaria[] = [
  { id: 'cavalo_crioulo', nome: 'Cavalo Crioulo', tipo: 'cavalo', velocidade: 11, folego: 25, carga: 10, passageiros: 2, vida: 150,
    comoConseguir: 'Presente da Irmandade (Capítulo 4)', terreno: 'terra', modelo: 'montarias/cavalo_crioulo.glb' },
  { id: 'cavalo_selvagem', nome: 'Cavalo Selvagem', tipo: 'cavalo', velocidade: 13, folego: 30, carga: 8, passageiros: 2, vida: 140,
    comoConseguir: 'Domar no campo (chegue furtivo e segure ✋)', terreno: 'terra', modelo: 'montarias/cavalo_selvagem.glb' },
  { id: 'mangalarga', nome: 'Mangalarga Marchador', tipo: 'cavalo', velocidade: 14, folego: 45, carga: 10, passageiros: 2, vida: 160,
    comoConseguir: 'Comprar no estábulo de Vila Rica', terreno: 'terra', modelo: 'montarias/mangalarga.glb' },
  { id: 'cavalo_guerra', nome: 'Cavalo de Guerra com Armadura', tipo: 'cavalo', velocidade: 10, folego: 35, carga: 12, passageiros: 2, vida: 320,
    comoConseguir: 'Tomar do Capitão da Guarda (Capítulo 9)', terreno: 'terra', modelo: 'montarias/cavalo_guerra.glb' },
  { id: 'corcel_lanterna', nome: 'Corcel da Lanterna (lendário)', tipo: 'cavalo', velocidade: 16, folego: 60, carga: 15, passageiros: 2, vida: 400,
    comoConseguir: 'Concluir a história principal', terreno: 'terra', modelo: 'montarias/corcel_lanterna.glb' },
  { id: 'mula', nome: 'Mula de Tropeiro', tipo: 'mula', velocidade: 8, folego: 80, carga: 40, passageiros: 1, vida: 180,
    comoConseguir: 'Tropeiros na estrada da serra', terreno: 'terra', modelo: 'montarias/mula.glb' },
  { id: 'jumento', nome: 'Jumento', tipo: 'jumento', velocidade: 6.5, folego: 100, carga: 25, passageiros: 1, vida: 120,
    comoConseguir: 'Ajudar o fazendeiro (missão secundária)', terreno: 'terra', modelo: 'montarias/jumento.glb' },
  { id: 'boi', nome: 'Boi de Montaria', tipo: 'boi', velocidade: 5, folego: 120, carga: 30, passageiros: 1, vida: 300,
    comoConseguir: 'Fazendas do campo', terreno: 'terra', modelo: 'montarias/boi.glb' },
  { id: 'carro_de_boi', nome: 'Carro de Boi', tipo: 'carroca', velocidade: 4.5, folego: 999, carga: 80, passageiros: 5, vida: 400,
    comoConseguir: 'Libertar a fazenda (Capítulo 12). Leva o grupo todo!', terreno: 'terra', modelo: 'montarias/carro_de_boi.glb' },
  { id: 'carroca_cavalo', nome: 'Carroça a Cavalo', tipo: 'carroca', velocidade: 8, folego: 40, carga: 50, passageiros: 4, vida: 250,
    comoConseguir: 'Comprar no estábulo de Vila Rica', terreno: 'terra', modelo: 'montarias/carroca_cavalo.glb' },
  { id: 'canoa', nome: 'Canoa a Remo', tipo: 'canoa', velocidade: 6, folego: 60, carga: 15, passageiros: 3, vida: 100,
    comoConseguir: 'Construir com madeira nos rios', terreno: 'agua', modelo: 'montarias/canoa.glb' },
];

// Equipamentos de montaria (evoluem com materiais de animais caçados)
export const EQUIP_MONTARIA: { id: string; nome: string; efeito: string; custo: Partial<Record<Material, number>> }[] = [
  { id: 'sela_couro', nome: 'Sela de Couro', efeito: '+10% velocidade', custo: { couro: 6 } },
  { id: 'sela_onca', nome: 'Sela de Pele de Onça', efeito: '+20% velocidade, +15% fôlego', custo: { pele_onca: 1, couro_grosso: 3 } },
  { id: 'alforjes', nome: 'Alforjes', efeito: '+15 de carga', custo: { couro: 8, osso: 2 } },
  { id: 'barda_ferro', nome: 'Armadura de Ferro para Cavalo', efeito: '+100 de vida', custo: { ferro: 10, couro_grosso: 4 } },
  { id: 'ferraduras', nome: 'Ferraduras Reforçadas', efeito: '+30% fôlego', custo: { ferro: 4 } },
];
