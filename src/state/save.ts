import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { useJogo, type Progresso } from './store';

// 3 espaços de salvamento por aparelho. No PWA o AsyncStorage usa o localStorage.
export const SLOTS = 3;
const chave = (slot: number) => `sombra_vila_rica:save:${slot}`;

export async function salvar(slot: number, p: Progresso) {
  try {
    await AsyncStorage.setItem(chave(slot), JSON.stringify({ ...p, salvoEm: Date.now() }));
  } catch (e) { console.warn('Falha ao salvar', e); }
}

export async function carregar(slot: number): Promise<Progresso | null> {
  try {
    const t = await AsyncStorage.getItem(chave(slot));
    return t ? (JSON.parse(t) as Progresso) : null;
  } catch { return null; }
}

export async function listarSaves() {
  return Promise.all(Array.from({ length: SLOTS }, (_, i) => carregar(i)));
}

export const apagar = (slot: number) => AsyncStorage.removeItem(chave(slot));

export const salvarAgora = () => {
  const { progresso, slot } = useJogo.getState();
  if (progresso) return salvar(slot, progresso);
};

// Liga o salvamento automático: a cada 30s, ao minimizar/fechar o app e ao fechar a aba (PWA).
export function iniciarAutoSave() {
  const intervalo = setInterval(salvarAgora, 30_000);
  const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') salvarAgora(); });

  let limparWeb = () => {};
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const onHide = () => { if (document.visibilityState === 'hidden') salvarAgora(); };
    window.addEventListener('beforeunload', salvarAgora as any);
    document.addEventListener('visibilitychange', onHide);
    limparWeb = () => {
      window.removeEventListener('beforeunload', salvarAgora as any);
      document.removeEventListener('visibilitychange', onHide);
    };
  }
  return () => { clearInterval(intervalo); sub.remove(); limparWeb(); salvarAgora(); };
}
