// Árvores realistas geradas pelo jogo: tronco e galhos com casca de foto (Poly Haven) e copa feita de
// cachos de folhas reais (cartões com transparência). Cada espécie vira 2 InstancedMesh (tronco e folhas),
// então centenas de árvores rodam leve, inclusive no celular.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useTexture } from './drei';
import { textura } from './modelos';
import { aplicarVento } from './Efeitos';
import type { Transf } from './Cenario';

function semente(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

interface Especie { altura: number; raio: number; niveis: number; filhos: number; abertura: number; folhasPorPonta: number; tamFolha: number; copa: 'a' | 'b'; formaCopa: number }

const ESPECIES: Especie[] = [
  { altura: 7.5, raio: 0.28, niveis: 3, filhos: 3, abertura: 0.75, folhasPorPonta: 3, tamFolha: 2.6, copa: 'a', formaCopa: 1.0 },  // copa larga (tipo ipê/carvalho)
  { altura: 10, raio: 0.3, niveis: 3, filhos: 2, abertura: 0.5, folhasPorPonta: 3, tamFolha: 2.4, copa: 'b', formaCopa: 0.7 },    // alta e estreita
  { altura: 5.5, raio: 0.2, niveis: 2, filhos: 4, abertura: 0.9, folhasPorPonta: 4, tamFolha: 2.2, copa: 'a', formaCopa: 1.2 },   // baixa e cheia
];

const CIMA = new THREE.Vector3(0, 1, 0);

function gerar(esp: Especie, seed: number) {
  const rnd = semente(seed);
  const troncos: THREE.BufferGeometry[] = [], folhas: THREE.BufferGeometry[] = [];
  const centroCopa = new THREE.Vector3(0, esp.altura * 0.7, 0);

  const galho = (base: THREE.Vector3, dir: THREE.Vector3, comp: number, raio: number, nivel: number) => {
    const g = new THREE.CylinderGeometry(raio * 0.62, raio, comp, nivel === 0 ? 8 : 5, 1, true);
    g.translate(0, comp / 2, 0);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, raio * 9), uv.getY(i) * comp * 0.6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(CIMA, dir.clone().normalize()));
    g.translate(base.x, base.y, base.z);
    troncos.push(g);
    const ponta = base.clone().addScaledVector(dir.clone().normalize(), comp);

    if (nivel < esp.niveis) {
      const n = esp.filhos + (rnd() < 0.4 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const t = nivel === 0 ? 0.55 + rnd() * 0.45 : 0.5 + rnd() * 0.5;
        const p = base.clone().addScaledVector(dir.clone().normalize(), comp * t);
        const ang = (k / n) * Math.PI * 2 + rnd() * 1.2;
        const lateral = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
        const nd = dir.clone().normalize().multiplyScalar(1 - esp.abertura * 0.6).addScaledVector(lateral, esp.abertura).add(new THREE.Vector3(0, 0.25, 0)).normalize();
        galho(p, nd, comp * (0.55 + rnd() * 0.2), raio * 0.55, nivel + 1);
      }
    }
    if (nivel >= esp.niveis - 1) {
      // cachos de folhas perto da ponta: 2 cartões cruzados cada
      for (let k = 0; k < esp.folhasPorPonta; k++) {
        const s = esp.tamFolha * (0.75 + rnd() * 0.5);
        const p = ponta.clone().add(new THREE.Vector3((rnd() - 0.5) * 1.6, (rnd() - 0.3) * 1.2, (rnd() - 0.5) * 1.6).multiplyScalar(esp.formaCopa));
        const rot = new THREE.Euler(rnd() * 0.8 - 0.4, rnd() * Math.PI, rnd() * 0.8 - 0.4);
        for (const giro of [0, Math.PI / 2]) {
          const f = new THREE.PlaneGeometry(s, s);
          f.rotateY(giro); f.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot)); f.translate(p.x, p.y, p.z);
          folhas.push(f);
        }
      }
    }
  };

  const inclina = new THREE.Vector3((rnd() - 0.5) * 0.15, 1, (rnd() - 0.5) * 0.15);
  galho(new THREE.Vector3(0, -0.3, 0), inclina, esp.altura * 0.5, esp.raio, 0);

  const tronco = mergeGeometries(troncos)!; tronco.computeVertexNormals();
  const copa = mergeGeometries(folhas)!;
  // normais apontando para fora da copa: a luz fica suave e "volumosa", como copa de verdade
  const pos = copa.attributes.position as THREE.BufferAttribute, nor = copa.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).sub(centroCopa).normalize(); v.y = v.y * 0.8 + 0.2; v.normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
  troncos.forEach((g) => g.dispose()); folhas.forEach((g) => g.dispose());
  return { tronco, copa };
}

function Especies({ indice, lista, sombra, tex }: { indice: number; lista: Transf[]; sombra: boolean; tex: Record<string, THREE.Texture> }) {
  const esp = ESPECIES[indice];
  const { tronco, copa } = useMemo(() => gerar(esp, 1789 + indice * 31), [esp, indice]);
  const matTronco = useMemo(() => aplicarVento(new THREE.MeshStandardMaterial({ map: tex.casca_cor, normalMap: tex.casca_nor, roughness: 0.95 }), 0.015, esp.altura), [tex, esp]);
  const matCopa = useMemo(() => aplicarVento(new THREE.MeshStandardMaterial({
    map: esp.copa === 'a' ? tex.copa_a : tex.copa_b, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, transparent: false,
  }), 0.12, esp.altura, true), [tex, esp]);
  const rT = useRef<THREE.InstancedMesh>(null), rC = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), y = new THREE.Vector3(0, 1, 0);
    lista.forEach((l, i) => {
      m.compose(new THREE.Vector3(...l.p), q.setFromAxisAngle(y, l.r), new THREE.Vector3(l.s, l.s * (0.9 + ((i * 37) % 10) / 40), l.s));
      rT.current?.setMatrixAt(i, m); rC.current?.setMatrixAt(i, m);
    });
    [rT.current, rC.current].forEach((im) => { if (im) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); } });
  }, [lista]);
  if (!lista.length) return null;
  return (
    <>
      <instancedMesh ref={rT} args={[tronco, matTronco, lista.length]} castShadow={sombra} receiveShadow frustumCulled={false} />
      <instancedMesh ref={rC} args={[copa, matCopa, lista.length]} castShadow={sombra} receiveShadow frustumCulled={false} />
    </>
  );
}

const URLS = {
  casca_cor: textura('arvore/casca_cor.jpg'), casca_nor: textura('arvore/casca_nor.jpg'),
  copa_a: textura('arvore/copa_a.png'), copa_b: textura('arvore/copa_b.png'),
};

// Recebe as posições das árvores do mapa e distribui entre as espécies
export function Floresta({ lista, sombra, densidade = 1 }: { lista: Transf[]; sombra: boolean; densidade?: number }) {
  const tex = useTexture(URLS) as unknown as Record<string, THREE.Texture>;
  useLayoutEffect(() => {
    for (const [k, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = k.startsWith('casca') ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      t.colorSpace = k.endsWith('nor') ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
    }
  }, [tex]);
  const porEspecie = useMemo(() => {
    const out: Transf[][] = ESPECIES.map(() => []);
    lista.forEach((t, i) => {
      if (((i * 7919) % 100) / 100 > densidade) return;
      out[(((i * 13 + Math.floor(t.p[0])) % ESPECIES.length) + ESPECIES.length) % ESPECIES.length].push({ p: t.p, r: t.r, s: t.s });
    });
    return out;
  }, [lista, densidade]);
  return <>{porEspecie.map((l, i) => <Especies key={i} indice={((i % 3) + 3) % 3} lista={l} sombra={sombra} tex={tex} />)}</>;
}
