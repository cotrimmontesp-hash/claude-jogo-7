// Cor da neblina acompanhando o céu: dia azulado, pôr do sol alaranjado, noite azul-escura.
import * as THREE from 'three';
const DIA = new THREE.Color('#b9cde0'), POR = new THREE.Color('#e2a979'), NOITE = new THREE.Color('#1d2640');
export function corNeblina(h: number) {
  const elev = Math.sin(((h - 6) / 12) * Math.PI);
  const c = new THREE.Color();
  if (elev > 0.3) c.copy(DIA);
  else if (elev > -0.1) c.copy(POR).lerp(DIA, (elev + 0.1) / 0.4);
  else c.copy(NOITE).lerp(POR, Math.max(0, (elev + 0.4) / 0.3));
  return '#' + c.getHexString();
}
