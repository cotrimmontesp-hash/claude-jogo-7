// Entrada unificada: joystick na tela (celular) ou teclado/mouse (PC).
import { Platform } from 'react-native';

export const entrada = {
  mover: { x: 0, y: 0 },          // -1..1
  correr: false, pular: false, atacar: false, furtivo: false, interagir: false, visaoAguia: false,
  olhar: { dx: 0, dy: 0 },        // arraste da câmera
  zoom: 1,                        // rodinha do mouse (0.55–1.8)
  mouseTravado: false,            // mouse preso no jogo (estilo GTA)
};

const teclas = new Set<string>();

// USAR: cada aperto vale por meio segundo, mesmo que o dedo solte rápido ou o jogo esteja lento.
let usarEm = 0;
export function apertarUsar() { usarEm = Date.now(); }
export function usarPendente() { return usarEm > 0 && Date.now() - usarEm < 500; }
export function consumirUsar() { if (!usarPendente()) return false; usarEm = 0; return true; }

function atualizarTeclado() {
  const x = (teclas.has('d') ? 1 : 0) - (teclas.has('a') ? 1 : 0);
  const y = (teclas.has('w') ? 1 : 0) - (teclas.has('s') ? 1 : 0);
  const len = Math.hypot(x, y) || 1;
  entrada.mover = { x: x / len, y: y / len };
  entrada.correr = teclas.has('shift');
  entrada.pular = teclas.has(' ');
  entrada.furtivo = teclas.has('control') || teclas.has('c');
  entrada.interagir = teclas.has('e');
  entrada.visaoAguia = teclas.has('q');
}

export function ligarTecladoMouse() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  const down = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === 'e' && !e.repeat) apertarUsar(); teclas.add(k); atualizarTeclado(); };
  const up = (e: KeyboardEvent) => { teclas.delete(e.key.toLowerCase()); atualizarTeclado(); };
  // Clique na tela do jogo prende o mouse: mexer o mouse gira a câmera (Esc solta).
  const alvoValido = (e: Event) => (e.target as HTMLElement)?.tagName === 'CANVAS';
  const md = (e: MouseEvent) => {
    if (!document.pointerLockElement) {
      if (e.button === 0 && alvoValido(e)) { (e.target as HTMLElement).requestPointerLock?.(); }
      return;                                      // o primeiro clique só prende o mouse, não ataca
    }
    if (e.button === 0) entrada.atacar = true;
    if (e.button === 2) entrada.furtivo = true;    // botão direito: modo furtivo / mira
  };
  const mu = (e: MouseEvent) => { if (e.button === 0) entrada.atacar = false; if (e.button === 2) entrada.furtivo = teclas.has('control') || teclas.has('c'); };
  const mm = (e: MouseEvent) => {
    // com o mouse preso, ou segurando o botão esquerdo/direito: gira a câmera
    if (document.pointerLockElement || e.buttons & 3) {
      const lim = (v: number) => Math.max(-120, Math.min(120, v));          // ignora "pulos" que o Windows às vezes manda
      entrada.olhar.dx += lim(e.movementX); entrada.olhar.dy += lim(e.movementY);
    }
  };
  const roda = (e: WheelEvent) => { if (alvoValido(e) || document.pointerLockElement) entrada.zoom = Math.min(1.8, Math.max(0.55, entrada.zoom * (e.deltaY > 0 ? 1.08 : 0.92))); };
  const trava = () => { entrada.mouseTravado = !!document.pointerLockElement; if (!entrada.mouseTravado) entrada.atacar = false; };
  const menu = (e: Event) => e.preventDefault();
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  window.addEventListener('mousedown', md); window.addEventListener('mouseup', mu);
  window.addEventListener('mousemove', mm); window.addEventListener('contextmenu', menu);
  window.addEventListener('wheel', roda, { passive: true }); document.addEventListener('pointerlockchange', trava);
  return () => {
    window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
    window.removeEventListener('mousedown', md); window.removeEventListener('mouseup', mu);
    window.removeEventListener('mousemove', mm); window.removeEventListener('contextmenu', menu);
    window.removeEventListener('wheel', roda); document.removeEventListener('pointerlockchange', trava);
    if (document.pointerLockElement) document.exitPointerLock();
  };
}
