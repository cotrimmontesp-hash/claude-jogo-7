import { create } from 'zustand';
import { useJogo, type EstadoCla, type Guerreiro, type Progresso } from '../state/store';
import { GUERREIROS, CONSTRUCOES, FORTES, guerreirosMax, intervaloInvasao, poderInvasao, type Classe } from '../data/cla';
import type { Material } from '../data/items';
import { concluirMissao, useHistoria } from './historia';
import { ILHAS } from './mapa';
import { teleportar, pontoDoCais } from './teleporte';

const NOMES = ['Bento', 'Rosa', 'Joaquim', 'Luzia', 'Severino', 'Ana', 'Raimundo', 'Benedita', 'Firmino', 'Isabel', 'Damião', 'Conceição', 'Zé Pedro', 'Felícia', 'Antônio', 'Margarida'];

export const diaAtual = (p: Progresso) => p.diasSobrevividos + p.horaDoDia / 24;

export function poderGuerreiro(g: Guerreiro) {
  const t = GUERREIROS.find((x) => x.classe === g.classe)!;
  return g.ferido ? 0 : (t.dano + t.defesa + t.vida / 10) * (1 + (g.nivel - 1) * 0.15);
}
export function poderDefesa(c: EstadoCla) {
  const muros = (c.construcoes['paliçada'] ?? 0) * 25 + (c.construcoes.torres ?? 0) * 20 + (c.construcoes.armadilhas ?? 0) * 15;
  return c.guerreiros.reduce((s, g) => s + poderGuerreiro(g), 0) + muros;
}
export const poderAtaque = (c: EstadoCla, levados: string[]) =>
  c.guerreiros.filter((g) => levados.includes(g.id)).reduce((s, g) => s + poderGuerreiro(g), 0);

// Batalha automática (quando o jogador não está presente ou escolhe "deixar os guerreiros")
export function simular(aliado: number, inimigo: number, bonusHeroi = 0) {
  const total = aliado + bonusHeroi;
  const chance = total / (total + inimigo);
  const venceu = Math.random() < Math.min(0.95, Math.max(0.05, chance));
  const taxaPerda = venceu ? (1 - chance) * 0.5 : 0.5 + (1 - chance) * 0.3;
  return { venceu, taxaPerda };
}

function aplicarResultado(c: EstadoCla, ids: string[], taxaPerda: number, venceu: boolean): { guerreiros: Guerreiro[]; perdas: number } {
  let perdas = 0;
  const enfermaria = c.construcoes.enfermaria ?? 0;
  const guerreiros = c.guerreiros.flatMap((g) => {
    if (!ids.includes(g.id)) return [g];
    if (Math.random() < taxaPerda * 0.4 / (1 + enfermaria * 0.5)) { perdas++; return []; }                // caiu em batalha
    const ferido = Math.random() < taxaPerda;
    const xp = g.xp + (venceu ? 40 : 15); const nivel = Math.min(10, 1 + Math.floor(xp / 100));
    return [{ ...g, ferido, xp, nivel }];
  });
  return { guerreiros, perdas };
}

const somar = (a: Partial<Record<Material, number>>, b: Partial<Record<Material, number>>, sinal = 1) => {
  const r = { ...a }; for (const [k, v] of Object.entries(b)) r[k as Material] = Math.max(0, (r[k as Material] ?? 0) + sinal * (v ?? 0)); return r;
};
const temMat = (m: Partial<Record<Material, number>>, c: Partial<Record<Material, number>>) => Object.entries(c).every(([k, v]) => (m[k as Material] ?? 0) >= (v ?? 0));

// ---------- Ações do clã ----------
export function recrutar(classe: Classe): string | null {
  const p = useJogo.getState().progresso!; const t = GUERREIROS.find((x) => x.classe === classe)!;
  if (p.cla.guerreiros.length >= guerreirosMax(p.cla.construcoes.quartel ?? 0)) return 'Quartel cheio — evolua o Quartel';
  if (!temMat(p.materiais, t.custo)) return 'Materiais insuficientes';
  const novo: Guerreiro = { id: `g${Date.now()}`, classe, nome: NOMES[Math.floor(Math.random() * NOMES.length)], nivel: 1, xp: 0, vida: t.vida, ferido: false };
  useJogo.getState().atualizar((q) => ({ materiais: somar(q.materiais, t.custo, -1), cla: { ...q.cla, guerreiros: [...q.cla.guerreiros, novo] } }));
  return null;
}

export function construir(id: string): string | null {
  const p = useJogo.getState().progresso!; const c = CONSTRUCOES.find((x) => x.id === id)!;
  const nivel = p.cla.construcoes[id] ?? 0; if (nivel >= c.nivelMax) return 'Nível máximo';
  const custo = c.custo(nivel); if (!temMat(p.materiais, custo)) return 'Materiais insuficientes';
  useJogo.getState().atualizar((q) => ({ materiais: somar(q.materiais, custo, -1), cla: { ...q.cla, construcoes: { ...q.cla.construcoes, [id]: nivel + 1 } } }));
  return null;
}

export function curarFeridos() {
  useJogo.getState().atualizar((q) => ({ cla: { ...q.cla, guerreiros: q.cla.guerreiros.map((g) => ({ ...g, ferido: false })) } }));
}

// Defesa sem o jogador: os guerreiros e as muralhas lutam sozinhos
export function defenderAutomatico() {
  const p = useJogo.getState().progresso!; const inv = p.cla.invasaoAtiva; if (!inv) return;
  const { venceu, taxaPerda } = simular(poderDefesa(p.cla), inv.poder);
  const ids = p.cla.guerreiros.map((g) => g.id);
  const { guerreiros, perdas } = aplicarResultado(p.cla, ids, taxaPerda, venceu);
  const saque = venceu ? {} : Object.fromEntries(Object.entries(p.materiais).map(([k, v]) => [k, Math.floor((v ?? 0) * 0.25)])); // perde 25% se perder
  fecharInvasao(venceu, perdas, guerreiros, saque);
}

export function fecharInvasao(venceu: boolean, perdas: number, guerreiros?: Guerreiro[], saque: Partial<Record<Material, number>> = {}) {
  useJogo.getState().atualizar((q) => ({
    materiais: somar(q.materiais, saque, -1),
    cla: { ...q.cla, guerreiros: guerreiros ?? q.cla.guerreiros, invasaoAtiva: null, proximaInvasao: diaAtual(q) + intervaloInvasao(),
      historico: [{ quando: Date.now(), tipo: 'defesa' as const, alvo: 'Conselho de Ferro', venceu, perdas, saque }, ...q.cla.historico].slice(0, 20) },
  }));
  useBatalha.getState().encerrar();
}

// Invadir forte inimigo
export function invadirAutomatico(forteId: string, levados: string[]) {
  const p = useJogo.getState().progresso!; const f = FORTES.find((x) => x.id === forteId)!;
  const { venceu, taxaPerda } = simular(poderAtaque(p.cla, levados), f.poder, 60);
  const { guerreiros, perdas } = aplicarResultado(p.cla, levados, taxaPerda, venceu);
  fecharAtaque(forteId, venceu, perdas, guerreiros);
  return venceu;
}

export function fecharAtaque(forteId: string, venceu: boolean, perdas: number, guerreiros?: Guerreiro[]) {
  const f = FORTES.find((x) => x.id === forteId)!;
  useJogo.getState().atualizar((q) => {
    const primeira = !q.cla.fortesConquistados.includes(forteId);
    const saque = venceu ? (primeira ? f.recompensa : Object.fromEntries(Object.entries(f.recompensa).map(([k, v]) => [k, Math.ceil((v ?? 0) / 3)]))) : {};
    return {
      materiais: somar(q.materiais, saque),
      cla: { ...q.cla, guerreiros: guerreiros ?? q.cla.guerreiros,
        fortesConquistados: venceu && primeira ? [...q.cla.fortesConquistados, forteId] : q.cla.fortesConquistados,
        historico: [{ quando: Date.now(), tipo: 'ataque' as const, alvo: f.nome, venceu, perdas, saque }, ...q.cla.historico].slice(0, 20) },
    };
  });
  useBatalha.getState().encerrar();
}

// Chamado a cada segundo pelo Mundo: dispara invasões
export function verificarInvasao() {
  const p = useJogo.getState().progresso; if (!p || p.cla.invasaoAtiva) return;
  if (diaAtual(p) >= p.cla.proximaInvasao) {
    useJogo.getState().atualizar((q) => ({ cla: { ...q.cla, invasaoAtiva: { poder: poderInvasao(q.capitulo, q.diasSobrevividos), inicio: diaAtual(q) } } }));
  }
}

// ---------- Batalha jogável no mapa (você + seus guerreiros x inimigos) ----------
export interface Combatente { uid: string; lado: 'aliado' | 'inimigo'; classe: Classe | 'guarda'; nome: string; vida: number; vidaMax: number; dano: number; vel: number; pos: [number, number, number]; guerreiroId?: string; }

interface EstadoBatalha {
  ativa: null | { tipo: 'defesa' | 'ataque' | 'missao'; forteId?: string; levados: string[] };
  combatentes: Combatente[];
  iniciar: (tipo: 'defesa' | 'ataque' | 'missao', inimigos: number, poderPorInimigo: number, levados: string[], forteId?: string, centroInimigos?: [number, number]) => void;
  encerrar: () => void;
}

export const useBatalha = create<EstadoBatalha>((set) => ({
  ativa: null, combatentes: [],
  iniciar: (tipo, inimigos, poderPorInimigo, levados, forteId, centroInimigos) => {
    const p = useJogo.getState().progresso!;
    const centro = p.posicao;
    const aliados: Combatente[] = p.cla.guerreiros.filter((g) => levados.includes(g.id) && !g.ferido).map((g, i) => {
      const t = GUERREIROS.find((x) => x.classe === g.classe)!; const mult = 1 + (g.nivel - 1) * 0.15;
      return { uid: `a${g.id}`, lado: 'aliado', classe: g.classe, nome: g.nome, vida: t.vida * mult, vidaMax: t.vida * mult, dano: t.dano * mult, vel: t.velocidade,
        pos: [centro[0] + Math.cos(i) * 2.5, 0, centro[2] + Math.sin(i) * 2.5], guerreiroId: g.id };
    });
    const inim: Combatente[] = Array.from({ length: inimigos }, (_, i) => ({
      uid: `i${i}`, lado: 'inimigo', classe: 'guarda', nome: 'Guarda do Conselho', vida: poderPorInimigo * 2, vidaMax: poderPorInimigo * 2, dano: poderPorInimigo * 0.35, vel: 3.3,
      pos: centroInimigos ? [centroInimigos[0] + Math.cos(i * 1.3) * (3 + i), 0, centroInimigos[1] + Math.sin(i * 1.3) * (3 + i)]
        : [centro[0] + 18 + (i % 5) * 1.5, 0, centro[2] - 6 + Math.floor(i / 5) * 1.5],
    }));
    set({ ativa: { tipo, forteId, levados }, combatentes: [...aliados, ...inim] });
  },
  encerrar: () => set({ ativa: null, combatentes: [] }),
}));

export function defenderNoMapa() {
  const p = useJogo.getState().progresso!; const inv = p.cla.invasaoAtiva!;
  teleportar(pontoDoCais('refugio'));                    // corre para defender a ilha do clã
  const qtd = Math.min(20, 4 + Math.floor(inv.poder / 40));
  setTimeout(() => useBatalha.getState().iniciar('defesa', qtd, inv.poder / qtd, p.cla.guerreiros.map((g) => g.id)), 400);
}

const ILHA_DO_FORTE: Record<string, string> = { cla_serra: 'serra', cla_corsarios: 'corsarios', fortaleza_ferro: 'conselho' };
export function invadirNoMapa(forteId: string, levados: string[]) {
  const f = FORTES.find((x) => x.id === forteId)!;
  const ilhaId = ILHA_DO_FORTE[forteId];
  if (ilhaId) {
    // invasão de outra ilha: o grupo desembarca no cais e os defensores esperam no forte
    const ilha = ILHAS.find((i) => i.id === ilhaId)!, chegada = pontoDoCais(ilhaId);
    teleportar(chegada);
    setTimeout(() => useBatalha.getState().iniciar('ataque', Math.min(20, f.guardas), f.poder / f.guardas, levados, forteId,
      [(chegada.x + ilha.centro[0]) / 2, (chegada.z + ilha.centro[1]) / 2]), 400);
    return;
  }
  useBatalha.getState().iniciar('ataque', Math.min(20, f.guardas), f.poder / f.guardas, levados, forteId);
}

// Fim da batalha jogável: aplica feridos/mortos de verdade
export function terminarBatalhaNoMapa(venceu: boolean) {
  const b = useBatalha.getState(); const p = useJogo.getState().progresso!; if (!b.ativa) return;
  if (b.ativa.tipo === 'missao') {                       // luta da história: venceu = missão concluída; perdeu = tenta de novo
    b.encerrar(); useHistoria.setState({ contagem: 0 });
    if (venceu) concluirMissao();
    return;
  }
  const caidos = b.combatentes.filter((c) => c.lado === 'aliado' && c.vida <= 0).map((c) => c.guerreiroId!);
  const guerreiros = p.cla.guerreiros.flatMap((g) => {
    if (!b.ativa!.levados.includes(g.id)) return [g];
    const caiu = caidos.includes(g.id);
    if (caiu && Math.random() < 0.3) return [];               // 30% dos que caem morrem; o resto volta ferido
    const xp = g.xp + (venceu ? 50 : 20);
    return [{ ...g, ferido: caiu, xp, nivel: Math.min(10, 1 + Math.floor(xp / 100)) }];
  });
  const perdas = p.cla.guerreiros.length - guerreiros.length;
  if (b.ativa.tipo === 'defesa') fecharInvasao(venceu, perdas, guerreiros, venceu ? {} : Object.fromEntries(Object.entries(p.materiais).map(([k, v]) => [k, Math.floor((v ?? 0) * 0.25)])));
  else fecharAtaque(b.ativa.forteId!, venceu, perdas, guerreiros);
}
