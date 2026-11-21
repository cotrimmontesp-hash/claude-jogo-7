import { create } from 'zustand';
import type { Material } from '../data/items';
import type { Classe } from '../data/cla';
import type { Heroi } from '../data/characters';
import type { ModoJogo } from '../data/modes';
import { qualidadeInicial } from '../game/qualidade';

export type ModoCamera = 'terceira' | 'cima' | 'lateral';

export interface ItemInventario { id: string; nivel: number; }

export interface Progresso {
  heroi: Heroi['id'];
  modo: ModoJogo;
  diasSobrevividos: number;
  capitulo: number; missao: number;
  missoesConcluidas: string[];
  posicao: [number, number, number];
  vida: number; fome: number; sede: number; energia: number;
  horaDoDia: number; // 0–24
  materiais: Partial<Record<Material, number>>;
  armas: ItemInventario[]; armaduras: ItemInventario[];
  equipado: { arma: string; cabeca?: string; peito?: string; bracos?: string; pernas?: string };
  escolhas: Record<string, string>;
  skins: string[]; skinAtual: string; skinMontaria?: string; skinArma?: string;
  cla: EstadoCla;
  procurado: number;             // 0–5 estrelas: guardas te caçam (estilo GTA)
  montarias: string[];            // montarias que o jogador já tem
  montado: string | null;         // em qual está agora
  equipMontaria: string[];
  tempoJogado: number; // segundos
  salvoEm: number;
}

export type Qualidade = 'baixo' | 'medio' | 'alto' | 'ultra';
export interface Guerreiro { id: string; classe: Classe; nome: string; nivel: number; xp: number; vida: number; ferido: boolean; }
export interface RegistroBatalha { quando: number; tipo: 'defesa' | 'ataque'; alvo: string; venceu: boolean; perdas: number; saque: Partial<Record<Material, number>>; }
export interface EstadoCla {
  nome: string;
  guerreiros: Guerreiro[];
  construcoes: Record<string, number>;      // id -> nível
  proximaInvasao: number;                    // em dias do jogo (comparar com diasSobrevividos + hora/24)
  invasaoAtiva: { poder: number; inicio: number } | null;
  fortesConquistados: string[];
  historico: RegistroBatalha[];
}

export const claInicial = (): EstadoCla => ({
  nome: 'Refúgio da Lanterna',
  guerreiros: [
    { id: 'g1', classe: 'espadachim', nome: 'Bento', nivel: 1, xp: 0, vida: 120, ferido: false },
    { id: 'g2', classe: 'lanceiro', nome: 'Rosa', nivel: 1, xp: 0, vida: 110, ferido: false },
  ],
  construcoes: { 'paliçada': 1, quartel: 0 },
  proximaInvasao: 3, invasaoAtiva: null, fortesConquistados: [], historico: [],
});

export interface Config { camera: ModoCamera; volume: number; sensibilidade: number; vozAtiva: boolean; qualidade: Qualidade; autoQualidade?: boolean; }

export const progressoInicial = (heroi: Heroi['id'], modo: ModoJogo): Progresso => ({
  heroi, modo, diasSobrevividos: 0, capitulo: 1, missao: 1, missoesConcluidas: [], posicao: [150, 0, 160],   // começa na aldeia de Inês
  vida: 100, fome: 100, sede: 100, energia: 100, horaDoDia: 17.2,
  materiais: {}, armas: [{ id: 'faca', nivel: 0 }], armaduras: [],
  equipado: { arma: 'faca' }, escolhas: {}, montarias: [], montado: null, equipMontaria: [],
  skins: [`${heroi}_padrao`], skinAtual: `${heroi}_padrao`, procurado: 0, cla: claInicial(), tempoJogado: 0, salvoEm: 0,
});

type Tela = 'menu' | 'modo' | 'personagem' | 'jogo' | 'config' | 'forja' | 'cla';

interface Estado {
  tela: Tela; slot: number; progresso: Progresso | null; config: Config;
  modoEscolhido: ModoJogo; setModo: (m: ModoJogo) => void;
  irPara: (t: Tela) => void;
  setProgresso: (p: Progresso | null) => void;
  atualizar: (f: (p: Progresso) => Partial<Progresso>) => void;
  setConfig: (c: Partial<Config>) => void;
  setSlot: (s: number) => void;
}

export const useJogo = create<Estado>((set) => ({
  tela: 'menu', slot: 0, progresso: null,
  config: { camera: 'terceira', volume: 0.8, sensibilidade: 1, vozAtiva: true, qualidade: qualidadeInicial() },
  modoEscolhido: 'historia_solo', setModo: (modoEscolhido) => set({ modoEscolhido }),
  irPara: (tela) => set({ tela }),
  setProgresso: (progresso) => set({ progresso }),
  atualizar: (f) => set((s) => (s.progresso ? { progresso: { ...s.progresso, ...f(s.progresso) } } : s)),
  setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
  setSlot: (slot) => set({ slot }),
}));
