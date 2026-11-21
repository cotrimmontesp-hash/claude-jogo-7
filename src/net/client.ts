// Cliente online: conta, amigos, sala (lobby até 5) e sinalização da chamada de voz.
// Fala com o servidor em /server via WebSocket.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const SERVIDOR = process.env.EXPO_PUBLIC_SERVIDOR ?? 'ws://localhost:8787';

export interface Amigo { id: string; nome: string; codigo: string; online: boolean; emSala?: string; }
export interface MembroSala { id: string; nome: string; heroi: 'ines' | 'tome'; pronto: boolean; dono: boolean; }
export interface Sala { codigo: string; modo: string; membros: MembroSala[]; }
export interface Convite { de: Amigo; sala: string; }

interface EstadoOnline {
  conectado: boolean; eu: { id: string; nome: string; codigo: string } | null;
  amigos: Amigo[]; pedidos: Amigo[]; convites: Convite[]; sala: Sala | null;
  set: (p: Partial<EstadoOnline>) => void;
}

export const useOnline = create<EstadoOnline>((set) => ({
  conectado: false, eu: null, amigos: [], pedidos: [], convites: [], sala: null,
  set: (p) => set(p),
}));

type Ouvinte = (msg: any) => void;
let ws: WebSocket | null = null;
const ouvintes = new Set<Ouvinte>();
let tentativas = 0;

export function enviar(tipo: string, dados: Record<string, unknown> = {}) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ tipo, ...dados }));
}
export const ouvir = (f: Ouvinte) => { ouvintes.add(f); return () => ouvintes.delete(f); };

export async function conectar(nome: string) {
  let token = await AsyncStorage.getItem('sombra:token');
  ws = new WebSocket(SERVIDOR);
  ws.onopen = () => { tentativas = 0; enviar('entrar', { nome, token }); };
  ws.onclose = () => {
    useOnline.getState().set({ conectado: false });
    setTimeout(() => conectar(nome), Math.min(15000, 1000 * 2 ** tentativas++)); // reconecta sozinho
  };
  ws.onmessage = async (ev) => {
    const msg = JSON.parse(String(ev.data));
    const s = useOnline.getState();
    switch (msg.tipo) {
      case 'bem_vindo':
        if (msg.token !== token) { token = msg.token; await AsyncStorage.setItem('sombra:token', msg.token); }
        s.set({ conectado: true, eu: msg.eu, amigos: msg.amigos, pedidos: msg.pedidos }); break;
      case 'amigos': s.set({ amigos: msg.amigos, pedidos: msg.pedidos }); break;
      case 'convite': s.set({ convites: [...s.convites, { de: msg.de, sala: msg.sala }] }); break;
      case 'sala': s.set({ sala: msg.sala }); break;
      case 'saiu_sala': s.set({ sala: null }); break;
    }
    ouvintes.forEach((f) => f(msg));
  };
}

// Amigos
export const adicionarAmigo = (codigoOuNome: string) => enviar('amigo_adicionar', { alvo: codigoOuNome.trim() });
export const aceitarAmigo = (id: string) => enviar('amigo_aceitar', { id });
export const recusarAmigo = (id: string) => enviar('amigo_recusar', { id });
export const removerAmigo = (id: string) => enviar('amigo_remover', { id });
export const convidar = (id: string) => enviar('convidar', { id });

// Sala
export const criarSala = (modo: string, heroi: string) => enviar('sala_criar', { modo, heroi });
export const entrarSala = (codigo: string, heroi: string) => enviar('sala_entrar', { codigo: codigo.toUpperCase(), heroi });
export const sairSala = () => enviar('sala_sair');
export const marcarPronto = (pronto: boolean) => enviar('sala_pronto', { pronto });
export const iniciarPartida = () => enviar('sala_iniciar');

// Jogo (posição/ações dos jogadores, ~15x por segundo)
export const enviarEstadoJogador = (e: { p: number[]; r: number; anim: string }) => enviar('jogador', e);
