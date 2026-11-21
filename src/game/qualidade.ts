import type { Qualidade } from '../state/store';

// Presets de gráfico. "Ultra" é para PC forte; celulares começam em "Médio".
export const PRESETS: Record<Qualidade, { dpr: number; sombra: number; distancia: number; posEfeitos: boolean; ssao: boolean; grama: number }> = {
  baixo: { dpr: 0.75, sombra: 512, distancia: 200, posEfeitos: false, ssao: false, grama: 0 },
  medio: { dpr: 1, sombra: 1024, distancia: 270, posEfeitos: true, ssao: false, grama: 5000 },
  alto: { dpr: 1.5, sombra: 2048, distancia: 330, posEfeitos: true, ssao: true, grama: 10000 },
  ultra: { dpr: 2, sombra: 4096, distancia: 420, posEfeitos: true, ssao: true, grama: 18000 },
};

// Qualidade inicial: PC = Alto, celular = Médio
export function qualidadeInicial(): Qualidade {
  if (typeof window === 'undefined') return 'medio';
  const toque = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  if (toque) return 'medio';
  // placa de vídeo integrada (Intel/AMD básica) começa no Médio; placa dedicada começa no Alto
  try {
    const gl = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null;
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const placa = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/intel|uhd|iris|radeon\(tm\) graphics|vega|mali|adreno|swiftshader/i.test(placa)) return 'medio';
  } catch {}
  return 'alto';
}

export const ORDEM: Qualidade[] = ['baixo', 'medio', 'alto', 'ultra'];
