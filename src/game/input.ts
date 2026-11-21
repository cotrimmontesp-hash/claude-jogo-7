// Entrada unificada: joystick na tela (celular) ou teclado/mouse (PC).
import { Platform } from 'react-native';

export const entrada = {
  mover: { x: 0, y: 0 },          // -1..1
  correr: false, pular: false, atacar: false, furtivo: false, interagir: false, visaoAguia: false,
  olhar: { dx: 0, dy: 0 },        // arraste da câmera
};

const teclas = new Set<string>();

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
  const down = (e: KeyboardEvent) => { teclas.add(e.key.toLowerCase()); atualizarTeclado(); };
  const up = (e: KeyboardEvent) => { teclas.delete(e.key.toLowerCase()); atualizarTeclado(); };
  const md = (e: MouseEvent) => { if (e.button === 0) entrada.atacar = true; };
  const mu = () => { entrada.atacar = false; };
  const mm = (e: MouseEvent) => { if (e.buttons & 2 || document.pointerLockElement) { entrada.olhar.dx += e.movementX; entrada.olhar.dy += e.movementY; } };
  const menu = (e: Event) => e.preventDefault();
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  window.addEventListener('mousedown', md); window.addEventListener('mouseup', mu);
  window.addEventListener('mousemove', mm); window.addEventListener('contextmenu', menu);
  return () => {
    window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
    window.removeEventListener('mousedown', md); window.removeEventListener('mouseup', mu);
    window.removeEventListener('mousemove', mm); window.removeEventListener('contextmenu', menu);
  };
}
