// Modo história: missões com objetivo, local no mapa, diálogos, chefes e recompensas.
import { create } from 'zustand';
import { LUGAR, ILHAS } from './mapa';
import { useJogo } from '../state/store';
import type { Material } from '../data/items';

export type TipoMissao = 'ir' | 'coletar' | 'cacar' | 'derrotar' | 'chefe' | 'falar';
export interface Fala { quem: string; texto: string }
export interface Recompensa { materiais?: Partial<Record<Material, number>>; arma?: string; armaduras?: string[]; skin?: string; montaria?: string }
export interface Missao {
  titulo: string; objetivo: string; tipo: TipoMissao; local: [number, number]; raio?: number;
  quantidade?: number; animal?: string; npc?: string; chefe?: ChefeDef; inimigos?: number;
  antes?: Fala[]; depois?: Fala[]; recompensa?: Recompensa;
}
export interface ChefeDef { nome: string; tipo: 'onca' | 'jacare' | 'humano'; vida: number; dano: number; escala: number }
export interface Capitulo { titulo: string; missoes: Missao[] }

const L = LUGAR;
const mais = (p: [number, number], dx: number, dz: number): [number, number] => [p[0] + dx, p[1] + dz];
const conj = (base: string) => ['cabeca', 'peito', 'bracos', 'pernas'].map((s) => `${base}_${s}`);
const ILHA_CONSELHO = ILHAS.find((i) => i.id === 'conselho')!.centro;

export const HISTORIA: Capitulo[] = [
  { titulo: 'A Noite do Fogo', missoes: [
    { titulo: 'Fuga', tipo: 'ir', local: mais(L.aldeia, -40, -60), raio: 10, objetivo: 'Saia da aldeia em chamas pela trilha do norte',
      antes: [{ quem: 'Dona Benedita', texto: 'Inês! Os homens do Conselho de Ferro puseram fogo em tudo! Corre pela trilha do norte, minha filha!' },
              { quem: 'Inês', texto: 'E vocês? Eu não vou deixar ninguém para trás!' },
              { quem: 'Dona Benedita', texto: 'Vai! Se te pegarem, ninguém vai saber a verdade sobre esta noite.' }],
      depois: [{ quem: 'Inês', texto: 'A aldeia... tudo virou cinza. Preciso sobreviver e descobrir quem mandou fazer isso.' }] },
    { titulo: 'Rastros', tipo: 'ir', local: mais(L.rio, 0, 10), raio: 10, objetivo: 'Siga as pegadas até a margem do rio',
      depois: [{ quem: 'Inês', texto: 'Pegadas de botas de ferro... e uma lanterna desenhada na lama. Alguém mais fugiu por aqui.' }] },
    { titulo: 'Primeira Fogueira', tipo: 'coletar', quantidade: 4, local: mais(L.rio, -30, -10), raio: 26, objetivo: 'Junte 4 feixes de lenha para a fogueira (aperte USAR/E perto deles)',
      depois: [{ quem: 'Inês', texto: 'Pronto, o fogo vai espantar os bichos. Agora preciso comer alguma coisa.' }], recompensa: { materiais: { madeira: 6 } } },
    { titulo: 'Caça de Sobrevivência', tipo: 'cacar', animal: 'capivara', quantidade: 1, local: mais(L.rio, -50, 40), raio: 60, objetivo: 'Cace uma capivara perto do rio',
      depois: [{ quem: 'Inês', texto: 'Com o couro dá para fazer uma proteção. Amanhã eu sigo a trilha da lanterna.' }], recompensa: { materiais: { couro: 4 } } },
  ] },
  { titulo: 'A Mata Fechada', missoes: [
    { titulo: 'Água Limpa', tipo: 'ir', local: mais(L.mata, 40, -20), raio: 10, objetivo: 'Encontre a nascente dentro da mata' },
    { titulo: 'O Caçador', tipo: 'falar', npc: 'Seu Damião', local: mais(L.mata, 10, 10), objetivo: 'Fale com o velho caçador Seu Damião',
      antes: [{ quem: 'Seu Damião', texto: 'Menina, por aqui é perigoso. Os batedores do Conselho estão vasculhando a mata atrás de quem fugiu.' },
              { quem: 'Seu Damião', texto: 'Pegue esse couro e vá ao ferreiro de Vila Rica. Uma armadura de couro pode salvar sua vida.' }],
      recompensa: { materiais: { couro: 8, osso: 4 }, armaduras: conj('couro') } },
    { titulo: 'Os Batedores', tipo: 'derrotar', inimigos: 3, local: mais(L.mata, -30, 30), raio: 16, objetivo: 'Derrote os 3 batedores do Conselho',
      depois: [{ quem: 'Inês', texto: 'Eles carregavam uma ordem com o selo do Conselho... "eliminar todos da aldeia". Isso foi planejado.' }],
      recompensa: { materiais: { ferro: 4 }, arma: 'sabre_cavalaria' } },
    { titulo: 'Vila Rica', tipo: 'ir', local: L.vila, raio: 14, objetivo: 'Chegue à praça de Vila Rica',
      depois: [{ quem: 'Inês', texto: 'Vila Rica... ouro para todo lado, e o povo passando fome. Preciso achar a Irmandade da Lanterna.' }] },
  ] },
  { titulo: 'A Onça Negra', missoes: [
    { titulo: 'O Ferreiro', tipo: 'falar', npc: 'Ferreiro Joaquim', local: [26, 2], objetivo: 'Fale com o ferreiro Joaquim na oficina',
      antes: [{ quem: 'Ferreiro Joaquim', texto: 'A Irmandade? Shhh! Fala baixo. Eles só aceitam quem prova coragem.' },
              { quem: 'Ferreiro Joaquim', texto: 'Uma Onça Negra anda matando os viajantes perto do covil, na mata a oeste. Traga a pele dela e eu te levo até eles.' },
              { quem: 'Ferreiro Joaquim', texto: 'E use a forja (no menu de pausa) para evoluir sua arma com o que caçar!' }] },
    { titulo: 'Marcas nas Árvores', tipo: 'ir', local: mais(L.covilOnca, 30, -20), raio: 10, objetivo: 'Siga as marcas de garra até perto do covil' },
    { titulo: 'Caçada Lendária', tipo: 'chefe', local: L.covilOnca, raio: 30, objetivo: 'Derrote a Onça Negra Lendária',
      chefe: { nome: 'Onça Negra Lendária', tipo: 'onca', vida: 700, dano: 22, escala: 2.1 },
      antes: [{ quem: 'Inês', texto: 'Olhos amarelos no escuro... é ela!' }],
      depois: [{ quem: 'Inês', texto: 'Ela era só um animal com fome... mas agora o caminho está livre.' }],
      recompensa: { arma: 'punhal_presa', armaduras: conj('cacador'), materiais: { pele_onca: 3, garra: 4 } } },
    { titulo: 'A Prova', tipo: 'falar', npc: 'Ferreiro Joaquim', local: [26, 2], objetivo: 'Leve a pele ao ferreiro Joaquim',
      antes: [{ quem: 'Ferreiro Joaquim', texto: 'Por Deus... você matou a Onça Negra! Vá ao mosteiro na serra, ao norte. Diga que a lanterna ainda brilha.' }] },
  ] },
  { titulo: 'A Lanterna Acesa', missoes: [
    { titulo: 'Subida da Serra', tipo: 'ir', local: mais(L.mosteiro, 0, 30), raio: 12, objetivo: 'Suba a serra até o mosteiro' },
    { titulo: 'O Mestre', tipo: 'falar', npc: 'Mestre Aurélio', local: L.mosteiro, objetivo: 'Fale com o Mestre Aurélio da Irmandade',
      antes: [{ quem: 'Mestre Aurélio', texto: 'A lanterna ainda brilha... então você é a sobrevivente de quem falam.' },
              { quem: 'Mestre Aurélio', texto: 'O Conselho de Ferro queimou sua aldeia porque havia ouro debaixo dela. Nós lutamos para que o ouro desta terra pertença ao povo.' },
              { quem: 'Mestre Aurélio', texto: 'Aceite esta lâmina oculta. E saiba: a Irmandade tem um refúgio numa ilha a oeste. Agora ele também é seu clã.' }],
      recompensa: { arma: 'lamina_oculta', armaduras: conj('irmandade'), skin: 'ines_irmandade', montaria: 'cavalo_crioulo' } },
    { titulo: 'Provação', tipo: 'derrotar', inimigos: 4, local: mais(L.mosteiro, 40, 20), raio: 16, objetivo: 'Vença o treino de combate com 4 irmãos' },
    { titulo: 'O Refúgio', tipo: 'ir', local: ILHAS[1].centro, raio: 20, objetivo: 'Vá de canoa até a Ilha do Refúgio (use o cais ao sul da ilha)',
      depois: [{ quem: 'Mestre Aurélio', texto: 'Este é o seu clã agora. Recrute guerreiros, fortaleça as muralhas. O Conselho vai vir.' }],
      recompensa: { materiais: { madeira: 20, ferro: 8 } } },
  ] },
  { titulo: 'O Traidor', missoes: [
    { titulo: 'Mensagem Roubada', tipo: 'derrotar', inimigos: 4, local: L.quartel, raio: 18, objetivo: 'Recupere a carta no quartel do Conselho',
      depois: [{ quem: 'Inês', texto: 'A carta fala de um traidor na Irmandade... e de um carregamento de ouro saindo das minas.' }] },
    { titulo: 'As Minas', tipo: 'ir', local: L.minas, raio: 16, objetivo: 'Investigue as minas a leste' },
    { titulo: 'O Feitor-Mor', tipo: 'chefe', local: mais(L.minas, 10, 18), raio: 30, objetivo: 'Derrote o Feitor-Mor das minas',
      chefe: { nome: 'Feitor-Mor', tipo: 'humano', vida: 900, dano: 26, escala: 1.25 },
      antes: [{ quem: 'Feitor-Mor', texto: 'Uma menina contra mim? Vou te acorrentar junto com os outros!' }],
      depois: [{ quem: 'Inês', texto: 'Os mineiros estão livres! E o feitor tinha a chave do cofre do Conselho.' }],
      recompensa: { arma: 'machado_duplo', armaduras: conj('ferro'), materiais: { ouro: 6, ferro: 12 } } },
    { titulo: 'O Jacaré Ancestral', tipo: 'chefe', local: L.pantano, raio: 30, objetivo: 'Derrote o Jacaré Ancestral no pântano',
      chefe: { nome: 'Jacaré Ancestral', tipo: 'jacare', vida: 1200, dano: 30, escala: 2.4 },
      recompensa: { arma: 'montante', armaduras: conj('onca'), materiais: { escama: 10, chifre: 2 } } },
  ] },
  { titulo: 'O Último Sino', missoes: [
    { titulo: 'A Travessia', tipo: 'ir', local: ILHA_CONSELHO, raio: 30, objetivo: 'Vá de canoa até a Ilha do Conselho de Ferro' },
    { titulo: 'A Guarda de Elite', tipo: 'derrotar', inimigos: 6, local: [ILHA_CONSELHO[0], ILHA_CONSELHO[1] + 20], raio: 20, objetivo: 'Derrote a guarda de elite na fortaleza' },
    { titulo: 'O Grão-Conselheiro', tipo: 'chefe', local: ILHA_CONSELHO, raio: 30, objetivo: 'Duelo final contra o Grão-Conselheiro',
      chefe: { nome: 'Grão-Conselheiro', tipo: 'humano', vida: 1800, dano: 34, escala: 1.35 },
      antes: [{ quem: 'Grão-Conselheiro', texto: 'Fui eu quem mandou queimar sua aldeia. O ouro vale mais que a vida de camponeses.' },
              { quem: 'Inês', texto: 'Então hoje o ouro volta para quem trabalha nas minas.' }],
      depois: [{ quem: 'Inês', texto: 'Acabou. Que o sino de Vila Rica toque pela liberdade!' }],
      recompensa: { arma: 'espada_lanterna', armaduras: conj('lanterna'), skin: 'ines_sombra', montaria: 'corcel_lanterna' } },
    { titulo: 'Epílogo', tipo: 'ir', local: L.vila, raio: 16, objetivo: 'Volte à praça de Vila Rica',
      depois: [{ quem: 'Mestre Aurélio', texto: 'Você virou lenda, Inês. A história continua: os clãs rivais das ilhas ainda ameaçam o Refúgio. Defenda seu povo!' }] },
  ] },
];

export const missaoAtual = () => {
  const p = useJogo.getState().progresso; if (!p) return null;
  const cap = HISTORIA[p.capitulo - 1]; if (!cap) return null;
  return cap.missoes[p.missao - 1] ?? null;
};

// ---------- estado durante o jogo ----------
interface EstadoHistoria {
  dialogo: Fala[] | null; indiceFala: number;
  contagem: number;                      // itens coletados / animais caçados / inimigos derrotados
  coletados: number[];
  chefe: null | { def: ChefeDef; vida: number };
  aviso: string;
  iniciada: string | null;                // chave da missão que já mostrou o diálogo de início
  abrirDialogo: (f: Fala[]) => void; avancar: () => void; set: (p: Partial<EstadoHistoria>) => void;
}

export const useHistoria = create<EstadoHistoria>((set, get) => ({
  dialogo: null, indiceFala: 0, contagem: 0, coletados: [], chefe: null, aviso: '', iniciada: null,
  abrirDialogo: (f) => set({ dialogo: f, indiceFala: 0 }),
  avancar: () => { const { dialogo, indiceFala } = get(); if (!dialogo) return; if (indiceFala + 1 >= dialogo.length) set({ dialogo: null, indiceFala: 0 }); else set({ indiceFala: indiceFala + 1 }); },
  set: (p) => set(p),
}));

const chave = () => { const p = useJogo.getState().progresso; return p ? `${p.capitulo}-${p.missao}` : ''; };

export function iniciarMissaoSeNecessario() {
  const m = missaoAtual(); const h = useHistoria.getState(); const k = chave();
  if (!m || h.iniciada === k) return;
  useHistoria.setState({ iniciada: k, contagem: 0, coletados: [], chefe: null });
  if (m.antes && m.tipo !== 'falar') h.abrirDialogo(m.antes);
}

function aplicarRecompensa(r?: Recompensa) {
  if (!r) return '';
  const nomes: string[] = [];
  useJogo.getState().atualizar((p) => {
    const mat = { ...p.materiais };
    for (const [k, v] of Object.entries(r.materiais ?? {})) mat[k as Material] = (mat[k as Material] ?? 0) + (v ?? 0);
    const armas = r.arma && !p.armas.some((a) => a.id === r.arma) ? [...p.armas, { id: r.arma, nivel: 0 }] : p.armas;
    const novas = (r.armaduras ?? []).filter((id) => !p.armaduras.some((a) => a.id === id)).map((id) => ({ id, nivel: 0 }));
    const equipado = { ...p.equipado };
    if (r.arma) equipado.arma = r.arma;
    for (const id of r.armaduras ?? []) { const slot = id.split('_').pop() as 'cabeca' | 'peito' | 'bracos' | 'pernas'; equipado[slot] = id; }
    return { materiais: mat, armas, armaduras: [...p.armaduras, ...novas], equipado,
      skins: r.skin && !p.skins.includes(r.skin) ? [...p.skins, r.skin] : p.skins,
      montarias: r.montaria && !p.montarias.includes(r.montaria) ? [...p.montarias, r.montaria] : p.montarias };
  });
  if (r.arma) nomes.push('nova arma');
  if (r.armaduras?.length) nomes.push('armadura nova');
  if (r.materiais) nomes.push('materiais');
  if (r.skin) nomes.push('skin nova');
  if (r.montaria) nomes.push('montaria nova');
  return nomes.length ? `Recompensa: ${nomes.join(', ')}!` : '';
}

export function concluirMissao() {
  const m = missaoAtual(); if (!m) return;
  const txt = aplicarRecompensa(m.recompensa);
  if (m.depois) useHistoria.getState().abrirDialogo(m.depois);
  useJogo.getState().atualizar((p) => {
    const cap = HISTORIA[p.capitulo - 1];
    const fim = p.missao >= cap.missoes.length;
    const concl = [...p.missoesConcluidas, `c${p.capitulo}m${p.missao}`];
    if (fim && p.capitulo >= HISTORIA.length) return { missoesConcluidas: concl, missao: p.missao + 1 };
    return fim ? { capitulo: p.capitulo + 1, missao: 1, missoesConcluidas: concl } : { missao: p.missao + 1, missoesConcluidas: concl };
  });
  useHistoria.setState({ aviso: `✔ Missão concluída: ${m.titulo}. ${txt}`, chefe: null, contagem: 0, coletados: [] });
  setTimeout(() => useHistoria.setState({ aviso: '' }), 5000);
}

// chamado pelo Mundo quando um animal morre
export function animalAbatido(id: string) {
  const m = missaoAtual(); if (!m || m.tipo !== 'cacar' || (m.animal && m.animal !== id)) return;
  const n = useHistoria.getState().contagem + 1; useHistoria.setState({ contagem: n });
  if (n >= (m.quantidade ?? 1)) concluirMissao();
}
