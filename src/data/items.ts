// Armas, armaduras, materiais e evolução (upgrade) com materiais de animais.

export type Raridade = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type Material =
  | 'couro' | 'couro_grosso' | 'osso' | 'presa' | 'pena' | 'garra'
  | 'escama' | 'chifre' | 'pele_onca' | 'ferro' | 'ouro' | 'madeira';

export type TipoArma = 'espada' | 'machado' | 'maca' | 'lanca' | 'adaga' | 'arco' | 'lamina_oculta';

export interface Arma {
  id: string; nome: string; tipo: TipoArma; raridade: Raridade;
  dano: number; velocidade: number; alcance: number; modelo: string;
}

export type SlotArmadura = 'cabeca' | 'peito' | 'bracos' | 'pernas';
export interface Armadura {
  id: string; nome: string; slot: SlotArmadura; raridade: Raridade;
  defesa: number; furtividade: number; modelo: string;
}

const a = (id: string, nome: string, tipo: TipoArma, raridade: Raridade, dano: number, velocidade: number, alcance: number): Arma =>
  ({ id, nome, tipo, raridade, dano, velocidade, alcance, modelo: `armas/${id}.glb` });

export const ARMAS: Arma[] = [
  // Espadas
  a('espada_ferro', 'Espada de Ferro', 'espada', 'comum', 12, 1.0, 1.6),
  a('sabre_cavalaria', 'Sabre de Cavalaria', 'espada', 'incomum', 16, 1.1, 1.7),
  a('espada_jesuita', 'Espada do Mosteiro', 'espada', 'raro', 22, 1.0, 1.8),
  a('montante', 'Montante de Duas Mãos', 'espada', 'epico', 34, 0.7, 2.2),
  a('espada_lanterna', 'Lâmina da Lanterna', 'espada', 'lendario', 45, 1.1, 1.9),
  // Machados
  a('machadinha', 'Machadinha', 'machado', 'comum', 13, 0.95, 1.3),
  a('machado_lenhador', 'Machado de Lenhador', 'machado', 'incomum', 19, 0.8, 1.5),
  a('machado_duplo', 'Machado de Lâmina Dupla', 'machado', 'raro', 27, 0.75, 1.6),
  a('machado_osso', 'Machado de Osso de Onça', 'machado', 'epico', 36, 0.8, 1.6),
  a('machado_trovao', 'Machado do Trovão', 'machado', 'lendario', 50, 0.75, 1.7),
  // Maças
  a('porrete', 'Porrete', 'maca', 'comum', 11, 0.9, 1.3),
  a('maca_ferro', 'Maça de Ferro', 'maca', 'raro', 26, 0.7, 1.4),
  a('martelo_guerra', 'Martelo de Guerra', 'maca', 'epico', 38, 0.6, 1.6),
  // Lanças
  a('lanca_madeira', 'Lança de Madeira', 'lanca', 'comum', 10, 1.0, 2.4),
  a('lanca_caca', 'Lança de Caça', 'lanca', 'incomum', 15, 1.0, 2.6),
  a('alabarda', 'Alabarda', 'lanca', 'epico', 32, 0.75, 2.8),
  // Adagas
  a('faca', 'Faca de Mato', 'adaga', 'comum', 8, 1.5, 0.9),
  a('punhal_presa', 'Punhal de Presa', 'adaga', 'raro', 18, 1.6, 1.0),
  a('adagas_gemeas', 'Adagas Gêmeas', 'adaga', 'lendario', 30, 1.9, 1.0),
  // Arcos
  a('arco_simples', 'Arco Simples', 'arco', 'comum', 10, 1.0, 30),
  a('arco_longo', 'Arco Longo', 'arco', 'raro', 20, 0.8, 45),
  a('arco_penas', 'Arco de Penas de Harpia', 'arco', 'epico', 28, 1.0, 50),
  // Lâmina oculta
  a('lamina_oculta', 'Lâmina Oculta', 'lamina_oculta', 'raro', 60, 1.2, 0.8),
];

const ar = (id: string, nome: string, slot: SlotArmadura, raridade: Raridade, defesa: number, furtividade: number): Armadura =>
  ({ id, nome, slot, raridade, defesa, furtividade, modelo: `armaduras/${id}.glb` });

// Conjuntos completos (4 peças cada)
const conjunto = (base: string, nome: string, raridade: Raridade, defesa: number, furt: number): Armadura[] => [
  ar(`${base}_cabeca`, `Capuz ${nome}`, 'cabeca', raridade, Math.round(defesa * 0.2), furt),
  ar(`${base}_peito`, `Peitoral ${nome}`, 'peito', raridade, Math.round(defesa * 0.4), furt),
  ar(`${base}_bracos`, `Braçadeiras ${nome}`, 'bracos', raridade, Math.round(defesa * 0.15), furt),
  ar(`${base}_pernas`, `Grevas ${nome}`, 'pernas', raridade, Math.round(defesa * 0.25), furt),
];

export const ARMADURAS: Armadura[] = [
  ...conjunto('trapos', 'de Trapos', 'comum', 10, 3),
  ...conjunto('couro', 'de Couro', 'incomum', 25, 2),
  ...conjunto('cacador', 'do Caçador', 'raro', 40, 3),
  ...conjunto('irmandade', 'da Irmandade', 'raro', 45, 4),
  ...conjunto('ferro', 'de Ferro', 'epico', 70, -2),
  ...conjunto('onca', 'da Onça', 'epico', 60, 5),
  ...conjunto('lanterna', 'da Lanterna', 'lendario', 95, 5),
];

// Evolução: cada nível (+1 até +5) custa materiais e aumenta 12% dos atributos.
export const NIVEL_MAX = 5;
export const BONUS_POR_NIVEL = 0.12;

const CUSTO_BASE: Record<Raridade, Partial<Record<Material, number>>> = {
  comum: { couro: 2, madeira: 2 },
  incomum: { couro: 3, osso: 2 },
  raro: { couro_grosso: 2, presa: 2, ferro: 2 },
  epico: { pele_onca: 1, garra: 3, ferro: 4 },
  lendario: { escama: 3, chifre: 2, ouro: 3 },
};

export function custoEvolucao(raridade: Raridade, nivelAtual: number) {
  const mult = nivelAtual + 1;
  const custo: Partial<Record<Material, number>> = {};
  for (const [m, q] of Object.entries(CUSTO_BASE[raridade])) custo[m as Material] = (q ?? 0) * mult;
  return custo;
}

export const valorComNivel = (base: number, nivel: number) => Math.round(base * (1 + BONUS_POR_NIVEL * nivel));
