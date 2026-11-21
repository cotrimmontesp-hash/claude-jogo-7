// Clã do jogador: base (Refúgio da Lanterna), guerreiros, construções, invasões sofridas e ataques a fortes inimigos.
import type { Material } from './items';

export type Classe = 'espadachim' | 'machadeiro' | 'lanceiro' | 'arqueiro' | 'batedor' | 'cavaleiro';

export interface TipoGuerreiro {
  classe: Classe; nome: string; vida: number; dano: number; defesa: number; velocidade: number;
  custo: Partial<Record<Material, number>>; desbloqueio: string;
}

export const GUERREIROS: TipoGuerreiro[] = [
  { classe: 'espadachim', nome: 'Espadachim', vida: 120, dano: 14, defesa: 8, velocidade: 3.5, custo: { ferro: 2, couro: 2 }, desbloqueio: 'Inicial' },
  { classe: 'machadeiro', nome: 'Machadeiro', vida: 150, dano: 18, defesa: 6, velocidade: 3.2, custo: { ferro: 3, madeira: 2 }, desbloqueio: 'Ferraria nível 2' },
  { classe: 'lanceiro', nome: 'Lanceiro', vida: 110, dano: 12, defesa: 12, velocidade: 3.4, custo: { madeira: 4, ferro: 1 }, desbloqueio: 'Inicial' },
  { classe: 'arqueiro', nome: 'Arqueiro', vida: 80, dano: 11, defesa: 3, velocidade: 3.8, custo: { madeira: 3, pena: 3 }, desbloqueio: 'Campo de tiro' },
  { classe: 'batedor', nome: 'Batedor Furtivo', vida: 70, dano: 25, defesa: 2, velocidade: 5, custo: { couro: 3, presa: 1 }, desbloqueio: 'Capítulo 5' },
  { classe: 'cavaleiro', nome: 'Cavaleiro', vida: 220, dano: 20, defesa: 14, velocidade: 9, custo: { ferro: 5, couro_grosso: 2 }, desbloqueio: 'Estábulo nível 2' },
];

export interface Construcao { id: string; nome: string; efeito: string; nivelMax: number; custo: (nivel: number) => Partial<Record<Material, number>>; }

export const CONSTRUCOES: Construcao[] = [
  { id: 'paliçada', nome: 'Paliçada e Portão', efeito: 'Defesa das muralhas contra invasões', nivelMax: 5, custo: (n) => ({ madeira: 10 * (n + 1), ferro: 2 * n }) },
  { id: 'torres', nome: 'Torres de Vigia', efeito: 'Arqueiros nas torres atiram nos invasores; avisam a invasão mais cedo', nivelMax: 4, custo: (n) => ({ madeira: 8 * (n + 1), pena: 3 * (n + 1) }) },
  { id: 'quartel', nome: 'Quartel', efeito: '+4 guerreiros no clã por nível', nivelMax: 5, custo: (n) => ({ madeira: 12 * (n + 1), couro: 5 * (n + 1) }) },
  { id: 'ferraria', nome: 'Ferraria', efeito: 'Libera machadeiros e melhora armas dos guerreiros', nivelMax: 5, custo: (n) => ({ ferro: 6 * (n + 1), osso: 3 * (n + 1) }) },
  { id: 'campo_tiro', nome: 'Campo de Tiro', efeito: 'Libera arqueiros', nivelMax: 3, custo: (n) => ({ madeira: 10 * (n + 1), pena: 5 * (n + 1) }) },
  { id: 'estabulo', nome: 'Estábulo', efeito: 'Guarda montarias e libera cavaleiros', nivelMax: 3, custo: (n) => ({ madeira: 15 * (n + 1), couro: 6 * (n + 1) }) },
  { id: 'enfermaria', nome: 'Enfermaria', efeito: 'Guerreiros feridos voltam mais rápido', nivelMax: 3, custo: (n) => ({ couro: 6 * (n + 1), pena: 2 * (n + 1) }) },
  { id: 'armadilhas', nome: 'Armadilhas', efeito: 'Fossos e estacas que ferem invasores', nivelMax: 3, custo: (n) => ({ madeira: 8 * (n + 1), osso: 4 * (n + 1) }) },
];

export const MAX_GUERREIROS_BASE = 4;
export const guerreirosMax = (nivelQuartel: number) => MAX_GUERREIROS_BASE + nivelQuartel * 4;

// Fortes inimigos para invadir (do mais fácil ao mais difícil)
export interface Forte { id: string; nome: string; regiao: string; poder: number; guardas: number; capitulo: number; recompensa: Partial<Record<Material, number>>; }

export const FORTES: Forte[] = [
  { id: 'acamp_batedores', nome: 'Acampamento dos Batedores', regiao: 'mata', poder: 60, guardas: 6, capitulo: 1, recompensa: { couro: 8, ferro: 3 } },
  { id: 'posto_estrada', nome: 'Posto da Estrada Real', regiao: 'serra', poder: 140, guardas: 10, capitulo: 2, recompensa: { ferro: 8, madeira: 10, ouro: 1 } },
  { id: 'fazenda_conselho', nome: 'Fazenda do Conselho', regiao: 'campo', poder: 220, guardas: 14, capitulo: 3, recompensa: { couro_grosso: 6, ferro: 10, ouro: 2 } },
  { id: 'quartel_vila', nome: 'Quartel de Vila Rica', regiao: 'cidade', poder: 350, guardas: 20, capitulo: 4, recompensa: { ferro: 18, ouro: 4 } },
  { id: 'forte_minas', nome: 'Forte das Minas', regiao: 'minas', poder: 500, guardas: 28, capitulo: 5, recompensa: { ouro: 8, ferro: 20 } },
  { id: 'cla_serra', nome: 'Ilha do Clã da Serra', regiao: 'serra', poder: 260, guardas: 16, capitulo: 3, recompensa: { madeira: 20, couro_grosso: 6, ouro: 2 } },
  { id: 'cla_corsarios', nome: 'Ilha dos Corsários', regiao: 'corsarios', poder: 420, guardas: 22, capitulo: 4, recompensa: { ferro: 16, ouro: 5, escama: 2 } },
  { id: 'fortaleza_ferro', nome: 'Fortaleza do Conselho de Ferro', regiao: 'conselho', poder: 800, guardas: 40, capitulo: 6, recompensa: { ouro: 15, escama: 5, chifre: 3 } },
];

// Invasões ao seu clã: chegam a cada 2–4 dias no jogo, ficam mais fortes com o tempo.
export const intervaloInvasao = () => 2 + Math.random() * 2; // dias do jogo
export const poderInvasao = (capitulo: number, dias: number) => Math.round(40 + capitulo * 25 + dias * 3);
