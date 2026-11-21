// Cor da neblina acompanhando o céu: dia azulado, pôr do sol alaranjado, noite azul-escura.
import * as THREE from 'three';
const DIA = new THREE.Color('#c6d6e4'), POR = new THREE.Color('#f0b47a'), NOITE = new THREE.Color('#1d2640');
export function corNeblina(h: number) {
  const elev = Math.sin(((h - 6) / 12) * Math.PI);
  const c = new THREE.Color();
  if (elev > 0.45) c.copy(DIA);
  else if (elev > -0.1) c.copy(POR).lerp(DIA, (elev + 0.1) / 0.55);   // tarde longa e dourada
  else c.copy(NOITE).lerp(POR, Math.max(0, (elev + 0.4) / 0.3));
  return '#' + c.getHexString();
}
