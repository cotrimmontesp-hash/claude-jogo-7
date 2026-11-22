// Terreno com relevo e texturas realistas (Poly Haven, CC0) misturadas por região:
// grama, chão de floresta, terra com folhas (estrada/praça), areia (rio), rocha e neve (montanhas).
import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from './drei';
import { textura } from './modelos';

import { ILHAS, TAM_MUNDO as TAM, LUGAR } from './mapa';
export const TAM_MUNDO = TAM;

// ruído simples e determinístico (soma de ondas) — mesmo resultado no celular e no PC
const r = (x: number, z: number, f: number, s: number) => Math.sin(x * f + s) * Math.cos(z * f * 1.3 - s * 0.7);
export function ruido(x: number, z: number) {
  return r(x, z, 0.018, 1.2) * 0.55 + r(x, z, 0.041, 3.1) * 0.28 + r(x, z, 0.09, 7.7) * 0.12 + r(x, z, 0.21, 2.4) * 0.05;
}

// Estrada de terra serpenteando pelo mapa
export const distEstrada = (x: number, z: number) => Math.abs(x - Math.sin(z * 0.025) * 18 - 6);
// Rio a leste
export const distRio = (x: number, z: number) => Math.abs(x - (70 + Math.sin(z * 0.03) * 12));
export const ALTURA_AGUA = -1.2;

const FUNDO_MAR = -9;
export const ALTURA_FORTALEZA = 4;

// Relevo da ilha principal: vila plana, morros, serra alta ao norte, rio a leste
function alturaPrincipal(x: number, z: number) {
  const d = Math.hypot(x, z);
  const vila = THREE.MathUtils.smoothstep(d, 30, 90);
  const norte = 0.35 + 0.65 * Math.max(0, -z / Math.max(d, 1));                // serra mais alta ao norte
  const serra = THREE.MathUtils.smoothstep(d, 150, 235) * (1 - THREE.MathUtils.smoothstep(d, 255, 290)) * norte * (40 + Math.max(0, ruido(x * 2, z * 2)) * 30);
  let h = ruido(x * 0.7, z * 0.7) * 7 * vila + serra + 1.2;
  const rio = distRio(x, z);
  if (rio < 9 && z > -120) h = THREE.MathUtils.lerp(ALTURA_AGUA - 1.4, h, THREE.MathUtils.smoothstep(rio, 3, 9));
  const est = distEstrada(x, z);
  if (est < 4) h = THREE.MathUtils.lerp(h * 0.6, h, est / 4);
  // platô plano da Fortaleza do Chefão
  const df = Math.hypot(x - LUGAR.fortaleza[0], z - LUGAR.fortaleza[1]);
  if (df < 70) h = THREE.MathUtils.lerp(ALTURA_FORTALEZA, h, THREE.MathUtils.smoothstep(df, 46, 70));
  return h;
}

// Ilhas dos clãs: morros suaves
const alturaIlhaClã = (x: number, z: number) => 1.5 + Math.max(0, ruido(x * 1.3 + 40, z * 1.3)) * 6;

export function altura(x: number, z: number) {
  let melhor = FUNDO_MAR;
  for (const ilha of ILHAS) {
    const dx = x - ilha.centro[0], dz = z - ilha.centro[1], d = Math.hypot(dx, dz);
    const costa = ilha.raio * (1 + ruido(Math.atan2(dz, dx) * 40, ilha.raio) * 0.12);   // contorno irregular
    if (d > costa + 40) continue;
    const terra = 1 - THREE.MathUtils.smoothstep(d, costa - 30, costa + 12);
    const base = ilha.id === 'principal' ? alturaPrincipal(x, z) : alturaIlhaClã(x, z);
    melhor = Math.max(melhor, THREE.MathUtils.lerp(FUNDO_MAR, base, terra));
  }
  return melhor;
}

const ss = THREE.MathUtils.smoothstep;
const ARQ = ['grama', 'terra', 'pedra', 'areia', 'floresta', 'calcada'] as const;

function criarMaterial(tex: Record<string, THREE.Texture>) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    for (const k of ARQ) { sh.uniforms[`t_${k}`] = { value: tex[`${k}_cor`] }; sh.uniforms[`n_${k}`] = { value: tex[`${k}_nor`] }; }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 peso; attribute vec2 peso2;
        varying vec4 vPeso; varying vec2 vPeso2; varying vec3 vPosM; varying vec3 vNorM;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPeso = peso; vPeso2 = peso2;
        vPosM = (modelMatrix * vec4(position, 1.0)).xyz;
        vNorM = normalize(mat3(modelMatrix) * normal);`);
    const uni = ARQ.map((k) => `uniform sampler2D t_${k}; uniform sampler2D n_${k};`).join('\n');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        ${uni}
        varying vec4 vPeso; varying vec2 vPeso2; varying vec3 vPosM; varying vec3 vNorM;
        // duas escalas misturadas para não aparecer a repetição da textura
        vec3 amostra(sampler2D t, vec2 uv) { return mix(texture2D(t, uv).rgb, texture2D(t, uv * 0.23 + 0.37).rgb, 0.4); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 uvT = vPosM.xz * 0.16;
        float soma = vPeso.x + vPeso.y + vPeso.z + vPeso.w + vPeso2.x + vPeso2.y;
        vec4 w = vPeso / max(soma, 1e-3); float w5 = vPeso2.x / max(soma, 1e-3); float w6 = vPeso2.y / max(soma, 1e-3);
        vec3 corT = amostra(t_grama, uvT) * w.x + amostra(t_terra, uvT * 1.4) * w.y + amostra(t_pedra, uvT * 0.35) * w.z
                  + amostra(t_areia, uvT * 1.2) * w.w + amostra(t_floresta, uvT * 1.1) * w5 + texture2D(t_calcada, vPosM.xz * 0.45).rgb * w6;
        diffuseColor.rgb *= corT;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 nm = (texture2D(n_grama, uvT).xyz * 2.0 - 1.0) * w.x + (texture2D(n_terra, uvT * 1.4).xyz * 2.0 - 1.0) * w.y
                  + (texture2D(n_pedra, uvT * 0.35).xyz * 2.0 - 1.0) * w.z + (texture2D(n_areia, uvT * 1.2).xyz * 2.0 - 1.0) * w.w
                  + (texture2D(n_floresta, uvT * 1.1).xyz * 2.0 - 1.0) * w5 + (texture2D(n_calcada, vPosM.xz * 0.45).xyz * 2.0 - 1.0) * w6;
          vec3 nW = normalize(vNorM + vec3(nm.x, 0.0, -nm.y) * 0.9);
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
        }`);
  };
  m.customProgramCacheKey = () => 'terreno-pbr';
  return m;
}

const pasta = (k: string) => (k === 'calcada' ? 'casa' : 'ph');
const URLS = Object.fromEntries(ARQ.flatMap((k) => [[`${k}_cor`, textura(`${pasta(k)}/${k}_cor.jpg`)], [`${k}_nor`, textura(`${pasta(k)}/${k}_nor.jpg`)]])) as Record<string, string>;

export function Terreno({ segmentos = 220 }: { segmentos?: number }) {
  const tex = useTexture(URLS) as unknown as Record<string, THREE.Texture>;
  useLayoutEffect(() => {
    for (const [k, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      t.colorSpace = k.endsWith('_cor') ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
    }
  }, [tex]);
  const mat = useMemo(() => criarMaterial(tex), [tex]);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(TAM_MUNDO, TAM_MUNDO, segmentos, segmentos);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const peso = new Float32Array(pos.count * 4), peso2 = new Float32Array(pos.count * 2), cores = new Float32Array(pos.count * 3);
    const c = new THREE.Color(), branco = new THREE.Color(2.2, 2.25, 2.4);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = altura(x, z);
      pos.setY(i, h);
      const d = Math.hypot(x, z), n = ruido(x * 2.7, z * 2.7);   // d = distância da praça de Vila Rica
      let grama = 1, terra = 0;
      let floresta = ss(d, 95, 130) * ss(n, -0.2, 0.3) * 0.9;                  // chão de floresta fora da vila
      terra = Math.max(terra, 1 - ss(distEstrada(x, z), 1.8, 3.6));           // estrada
      const calcada = 1 - ss(d, 18, 22);                                       // praça calçada de pedra (pé-de-moleque)
      terra = Math.max(terra, ss(n, 0.45, 0.6) * (1 - ss(d, 15, 60)) * 0.6);   // manchas de terra na vila
      const areia = Math.max(1 - ss(distRio(x, z), 6, 11), 1 - ss(h, 0.2, 2.2));   // margem do rio e praias
      const pedra = ss(h, 11, 22);
      const neve = ss(h, 30, 40);
      terra *= 1 - calcada;
      const outros = Math.max(terra, areia, pedra, calcada);
      grama *= 1 - outros; floresta *= 1 - outros;
      peso.set([grama, terra, pedra, areia], i * 4); peso2[i * 2] = floresta; peso2[i * 2 + 1] = calcada;
      c.setRGB(1, 1, 1).multiplyScalar(0.93 + n * 0.1).lerp(branco, neve);   // variação suave + neve nos picos
      cores.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('peso', new THREE.BufferAttribute(peso, 4));
    g.setAttribute('peso2', new THREE.BufferAttribute(peso2, 2));
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    g.computeVertexNormals();
    return g;
  }, [segmentos]);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}
