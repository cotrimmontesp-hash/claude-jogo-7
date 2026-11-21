// No app nativo o som ainda é silencioso (o Web Audio só existe no navegador). Mesmas funções, sem efeito.
export type EstadoAmbiente = { distMar: number; distFogo: number; distRio: number; hora: number; combate: boolean; montado: boolean };
export function iniciarSom() {}
export function prepararSom() {}
export function definirVolume(_v: number) {}
export function pausarSom(_p: boolean) {}
export function tocar(_e: string, _forca = 1) {}
export function atualizarAmbiente(_a: EstadoAmbiente) {}
