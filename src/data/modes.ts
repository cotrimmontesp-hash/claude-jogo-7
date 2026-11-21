export type ModoJogo = 'historia_solo' | 'historia_coop' | 'sobrevivencia' | 'cacadas';

export const MODOS: { id: ModoJogo; nome: string; descricao: string; maxJogadores: number; online: boolean }[] = [
  { id: 'historia_solo', nome: 'História Solo', descricao: 'A campanha completa, sozinho, com escolhas e finais diferentes.', maxJogadores: 1, online: false },
  { id: 'historia_coop', nome: 'História em Grupo', descricao: 'A campanha com até 5 amigos, com chamada de voz. O progresso fica salvo com o dono da sala.', maxJogadores: 5, online: true },
  { id: 'sobrevivencia', nome: 'Sobrevivência Livre', descricao: 'Mundo aberto sem missões: cace, forje e sobreviva o máximo de dias que conseguir.', maxJogadores: 5, online: true },
  { id: 'cacadas', nome: 'Caçadas', descricao: 'Enfrente os animais lendários e ganhe materiais raros para evoluir seu equipamento.', maxJogadores: 5, online: true },
];
