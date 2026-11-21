import type { Qualidade } from '../state/store';

// Presets de gráfico. "Ultra" é para PC forte; celulares começam em "Médio".
export const PRESETS: Record<Qualidade, { dpr: number; sombra: number; distancia: number; posEfeitos: boolean; ssao: boolean; grama: number }> = {
  baixo: { dpr: 0.75, sombra: 512, distancia: 60, posEfeitos: false, ssao: false, grama: 0 },
  medio: { dpr: 1, sombra: 1024, distancia: 110, posEfeitos: true, ssao: false, grama: 2000 },
  alto: { dpr: 1.5, sombra: 2048, distancia: 180, posEfeitos: true, ssao: true, grama: 6000 },
  ultra: { dpr: 2, sombra: 4096, distancia: 300, posEfeitos: true, ssao: true, grama: 15000 },
};
