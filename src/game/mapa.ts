// Mapa do mundo: ilha principal (Vila Rica, mata, serra, minas, rio) + ilha do seu clã + ilhas dos clãs inimigos.
export interface Ilha { id: string; nome: string; centro: [number, number]; raio: number; dono: 'principal' | 'jogador' | 'conselho' | 'rival'; cais: [number, number]; cor?: string }

export const ILHAS: Ilha[] = [
  { id: 'principal', nome: 'Ilha de Vila Rica', centro: [0, 0], raio: 300, dono: 'principal', cais: [20, 292] },
  { id: 'refugio', nome: 'Ilha do Refúgio (seu clã)', centro: [-440, -330], raio: 105, dono: 'jogador', cais: [-372, -262], cor: '#3a6ad6' },
  { id: 'conselho', nome: 'Ilha do Conselho de Ferro', centro: [450, -360], raio: 120, dono: 'conselho', cais: [372, -282], cor: '#8a1e1e' },
  { id: 'corsarios', nome: 'Ilha dos Corsários', centro: [460, 380], raio: 100, dono: 'rival', cais: [392, 316], cor: '#c9a23a' },
  { id: 'serra', nome: 'Ilha do Clã da Serra', centro: [-450, 400], raio: 95, dono: 'rival', cais: [-386, 338], cor: '#3f6e4a' },
];

export const TAM_MUNDO = 1200;
export const LIMITE_MUNDO = 580;

// Lugares importantes da ilha principal (usados pela história, NPCs e cenário)
export const LUGAR = {
  vila: [0, 0] as [number, number],                 // Vila Rica (praça)
  aldeia: [150, 160] as [number, number],           // aldeia de Inês, queimada no Capítulo 1
  rio: [78, 70] as [number, number],
  mata: [-150, 130] as [number, number],
  covilOnca: [-205, 175] as [number, number],
  mosteiro: [-70, -175] as [number, number],        // a Irmandade da Lanterna, na serra
  fazenda: [-115, 70] as [number, number],
  minas: [175, -150] as [number, number],
  pantano: [95, 225] as [number, number],
  quartel: [40, -95] as [number, number],
  fortaleza: [-10, -135] as [number, number],      // Fortaleza do Chefão, no meio do mapa
};

export const ilhaDe = (x: number, z: number) => ILHAS.find((i) => Math.hypot(x - i.centro[0], z - i.centro[1]) < i.raio + 25) ?? null;
