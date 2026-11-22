// Casas coloniais de Vila Rica (1789) geradas pelo jogo, com texturas realistas do Poly Haven:
// paredes caiadas, telhado de telha de barro, cunhais e molduras coloridas, janelas com venezianas,
// base de pedra, sobrados com sacada, venda, oficina, ruínas queimadas e a igreja barroca de duas torres.
// Cada tipo de casa vira poucos InstancedMesh (um por material), então a vila inteira roda leve.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useTexture } from './drei';
import { textura } from './modelos';

export type TipoCasa = 'terrea' | 'sobrado' | 'venda' | 'oficina' | 'ruina' | 'igreja';
export interface CasaPos { tipo: TipoCasa; p: [number, number, number]; r: number; s: number }

type Mat = 'parede' | 'telha' | 'madeira' | 'pedra' | 'moldura' | 'vidro' | 'luz' | 'planta' | 'flor' | 'tecido' | 'ferro';
type Partes = Record<Mat, THREE.BufferGeometry[]>;
const novo = (): Partes => ({ parede: [], telha: [], madeira: [], pedra: [], moldura: [], vidro: [], luz: [], planta: [], flor: [], tecido: [], ferro: [] });

// UV em metros (a textura não estica em paredes grandes)
function uvMundo(g: THREE.BufferGeometry, tile: number) {
  const pos = g.attributes.position as THREE.BufferAttribute, nor = g.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const [u, v] = ny > nx && ny > nz ? [x, z] : nx > nz ? [z, y] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

const TILE: Record<Mat, number> = { parede: 2.5, telha: 1.6, madeira: 1.2, pedra: 1.8, moldura: 1, vidro: 1, luz: 1, planta: 1, flor: 1, tecido: 1.5, ferro: 1 };

function caixa(P: Partes, m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
  g.translate(x, y, z);
  P[m].push(uvMundo(g, TILE[m]));
}

// Janela colonial: vidro escuro, moldura colorida, venezianas de madeira abertas
function janela(P: Partes, x: number, y: number, z: number, lado: 1 | -1, eixo: 'z' | 'x', alta = false) {
  const w = 1.0, h = alta ? 1.9 : 1.35, e = 0.12;
  const put = (m: Mat, ww: number, hh: number, dd: number, ox: number, oy: number, oz: number) => {
    if (eixo === 'z') caixa(P, m, ww, hh, dd, x + ox, y + oy, z + oz * lado);
    else caixa(P, m, dd, hh, ww, x + oz * lado, y + oy, z + ox);
  };
  put('vidro', w, h, 0.06, 0, 0, -0.02);
  put('moldura', w + 0.3, e, 0.14, 0, h / 2 + e / 2, 0.02);       // verga
  put('moldura', w + 0.4, e, 0.2, 0, -h / 2 - e / 2, 0.05);       // peitoril
  put('moldura', e, h, 0.14, -w / 2 - e / 2, 0, 0.02);
  put('moldura', e, h, 0.14, w / 2 + e / 2, 0, 0.02);
  put('madeira', w / 2, h, 0.05, -w * 0.82, 0, 0.1);               // venezianas abertas
  put('madeira', w / 2, h, 0.05, w * 0.82, 0, 0.1);
  if (!alta && lado === 1 && eixo === 'z' && y < 3) {                // floreira com flores na janela da frente
    put('madeira', w + 0.2, 0.22, 0.32, 0, -h / 2 - 0.3, 0.26);
    for (let i = 0; i < 5; i++) {
      put('planta', 0.2, 0.2, 0.2, -0.4 + i * 0.2, -h / 2 - 0.12, 0.26, );
      if (i % 2 === 0) put('flor', 0.12, 0.12, 0.12, -0.4 + i * 0.2, -h / 2 + 0.0, 0.3);
    }
  }
}

function porta(P: Partes, x: number, z: number, lado: 1 | -1, larg = 1.25, alt = 2.4) {
  // vão da porta aberta: dá para ver a luz de dentro da casa
  caixa(P, 'luz', larg, alt, 0.04, x, alt / 2 + 0.55, z + 0.005 * lado);
  // folha da porta aberta para fora, encostada na parede
  const th = 1.75, hx = x - larg / 2, dx = Math.cos(th), dz = Math.sin(th) * lado;
  caixa(P, 'madeira', larg, alt, 0.08, hx + dx * larg / 2, alt / 2 + 0.55, z + 0.05 * lado + dz * larg / 2, 0, -lado * th, 0);
  // lampião ao lado da porta
  caixa(P, 'madeira', 0.08, 0.08, 0.4, x + larg / 2 + 0.55, alt + 0.45, z + 0.2 * lado);
  caixa(P, 'luz', 0.26, 0.34, 0.26, x + larg / 2 + 0.55, alt + 0.2, z + 0.38 * lado);
  caixa(P, 'madeira', 0.34, 0.06, 0.34, x + larg / 2 + 0.55, alt + 0.4, z + 0.38 * lado);
  caixa(P, 'moldura', larg + 0.36, 0.18, 0.16, x, alt + 0.64, z + 0.02 * lado);
  caixa(P, 'moldura', 0.18, alt, 0.16, x - larg / 2 - 0.09, alt / 2 + 0.55, z + 0.02 * lado);
  caixa(P, 'moldura', 0.18, alt, 0.16, x + larg / 2 + 0.09, alt / 2 + 0.55, z + 0.02 * lado);
  caixa(P, 'pedra', larg + 0.6, 0.18, 0.6, x, 0.55, z + 0.25 * lado);  // degrau
}

// Telhado de duas águas com beiral (cumeeira no eixo X) + empenas
function telhado(P: Partes, W: number, D: number, H: number, incl = 0.5) {
  const meia = D / 2 + 0.55, comp = meia / Math.cos(incl), alturaT = Math.tan(incl) * meia;
  for (const s of [1, -1] as const) {
    const g = new THREE.BoxGeometry(W + 0.9, 0.14, comp);
    g.translate(0, 0, (comp / 2) * s);
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(incl * s));
    g.translate(0, H + alturaT - 0.05, 0);
    P.telha.push(uvMundo(g, TILE.telha));
  }
  caixa(P, 'telha', W + 0.95, 0.22, 0.3, 0, H + alturaT + 0.02, 0);   // cumeeira
  const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, Math.tan(incl) * (D / 2))]);
  for (const s of [1, -1]) {
    const g = new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false });
    g.rotateY(Math.PI / 2); g.translate(s * (W / 2) - (s > 0 ? 0.2 : 0), H, 0);
    P.parede.push(uvMundo(g, TILE.parede));
  }
}

function corpo(P: Partes, W: number, D: number, H: number) {
  caixa(P, 'pedra', W + 0.12, 0.6, D + 0.12, 0, 0.3, 0);                // embasamento de pedra
  caixa(P, 'parede', W, H - 0.6, D, 0, 0.6 + (H - 0.6) / 2, 0);
  for (const sx of [1, -1]) for (const sz of [1, -1])                    // cunhais nos cantos
    caixa(P, 'moldura', 0.28, H - 0.6, 0.28, sx * (W / 2 - 0.08), 0.6 + (H - 0.6) / 2, sz * (D / 2 - 0.08));
  caixa(P, 'moldura', W + 0.2, 0.22, D + 0.2, 0, H - 0.05, 0);            // cimalha
}

// ---------- detalhes no estilo Assassin's Creed ----------
// pontas dos caibros aparecendo embaixo do beiral
function caibros(P: Partes, W: number, D: number, H: number) {
  const n = Math.floor(W / 0.7);
  for (let i = 0; i <= n; i++) for (const s of [1, -1]) caixa(P, 'madeira', 0.12, 0.14, 0.7, -W / 2 + (i * W) / n, H + 0.05, s * (D / 2 + 0.3), -0.45 * s);
}
function chamine(P: Partes, x: number, z: number, H: number) {
  caixa(P, 'pedra', 0.9, 3.2, 0.9, x, H + 1.4, z);
  caixa(P, 'pedra', 1.1, 0.2, 1.1, x, H + 3.0, z);
  caixa(P, 'telha', 0.6, 0.12, 1.0, x, H + 3.25, z);
}
// toldo de pano listrado sobre a porta, com mão-francesa de madeira
function toldo(P: Partes, x: number, D: number, larg: number, y = 3.2) {
  caixa(P, 'tecido', larg, 0.05, 1.5, x, y, D / 2 + 0.72, 0.38);
  for (let i = 0; i < 4; i++) caixa(P, 'moldura', larg / 8, 0.06, 1.52, x - larg / 2 + larg / 8 + i * (larg / 4), y + 0.005, D / 2 + 0.72, 0.38);
  for (const sx of [-1, 1]) caixa(P, 'madeira', 0.08, 0.08, 1.3, x + sx * (larg / 2 - 0.1), y - 0.35, D / 2 + 0.55, -0.7);
  caixa(P, 'tecido', larg, 0.28, 0.03, x, y - 0.42, D / 2 + 1.42);                 // franja
}
// placa pendurada (venda, ferreiro)
function placa(P: Partes, x: number, D: number, y: number) {
  caixa(P, 'ferro', 0.05, 0.05, 1.1, x, y + 0.55, D / 2 + 0.55);
  caixa(P, 'ferro', 0.03, 0.4, 0.03, x, y + 0.32, D / 2 + 0.95);
  caixa(P, 'madeira', 0.08, 0.55, 0.85, x, y, D / 2 + 0.95);
  caixa(P, 'moldura', 0.1, 0.12, 0.6, x, y, D / 2 + 0.95);
}
// caixotes, barris e sacos encostados na casa
function tralha(P: Partes, x: number, D: number, sem: number) {
  const r = (k: number) => ((Math.sin(sem * 17.3 + k * 9.1) + 1) / 2);
  caixa(P, 'madeira', 0.8, 0.8, 0.8, x, 0.4, D / 2 + 0.6, 0, r(1) * 0.6, 0);
  caixa(P, 'madeira', 0.6, 0.6, 0.6, x + 0.15, 1.1, D / 2 + 0.6, 0, r(2), 0);
  const b = new THREE.CylinderGeometry(0.36, 0.32, 0.95, 12); b.translate(x + 1.0, 0.48, D / 2 + 0.5); P.madeira.push(uvMundo(b, TILE.madeira));
  for (const yy of [0.2, 0.76]) { const a = new THREE.TorusGeometry(0.355, 0.025, 4, 14); a.rotateX(Math.PI / 2); a.translate(x + 1.0, yy, D / 2 + 0.5); P.ferro.push(uvMundo(a, 1)); }
  caixa(P, 'tecido', 0.55, 0.5, 0.4, x - 0.75, 0.25, D / 2 + 0.45, 0, 0.3, 0.15);
}
// estrutura de madeira aparente (enxaimel) no andar de cima
function enxaimel(P: Partes, W: number, D: number, y0: number, y1: number) {
  const h = y1 - y0, n = Math.max(3, Math.round(W / 2.2));
  for (const s of [1, -1]) {
    const z = s * (D / 2 + 0.03);
    caixa(P, 'madeira', W, 0.2, 0.08, 0, y0 + 0.1, z); caixa(P, 'madeira', W, 0.2, 0.08, 0, y1 - 0.1, z);
    for (let i = 0; i <= n; i++) caixa(P, 'madeira', 0.18, h, 0.08, -W / 2 + (i * W) / n, y0 + h / 2, z);
    for (let i = 0; i < n; i += 2) {
      const x = -W / 2 + ((i + 0.5) * W) / n, dg = Math.atan2(h, W / n);
      caixa(P, 'madeira', Math.hypot(W / n, h) * 0.92, 0.15, 0.07, x, y0 + h / 2, z + 0.01 * s, 0, 0, dg * (i % 4 ? 1 : -1));
    }
  }
}
// térreo com barrado de pedra (com vão da porta) e cunhais de pedra aparelhada nos cantos
function terreoPedra(P: Partes, W: number, D: number, h: number, portaX = 0, portaL = 1.5) {
  const hb = 1.0, e = 0.14, esq = portaX - portaL / 2 - (-W / 2), dir = W / 2 - (portaX + portaL / 2);
  caixa(P, 'pedra', esq, hb, e, -W / 2 + esq / 2, hb / 2 + 0.3, D / 2 + e / 2);
  caixa(P, 'pedra', dir, hb, e, W / 2 - dir / 2, hb / 2 + 0.3, D / 2 + e / 2);
  caixa(P, 'pedra', W, hb, e, 0, hb / 2 + 0.3, -D / 2 - e / 2);
  for (const sx of [1, -1]) caixa(P, 'pedra', e, hb, D, sx * (W / 2 + e / 2), hb / 2 + 0.3, 0);
  for (const sx of [1, -1]) for (const sz of [1, -1]) for (let y = 0.8, k = 0; y < h; y += 0.45, k++) {
    const lx = k % 2 ? 0.55 : 0.32, lz = k % 2 ? 0.32 : 0.55;
    caixa(P, 'pedra', lx, 0.4, lz, sx * (W / 2 - lx / 2 + 0.08), y + 0.2, sz * (D / 2 - lz / 2 + 0.08));
  }
  caixa(P, 'moldura', W + 0.4, 0.25, D + 0.5, 0, h + 0.4, 0);
}

function terrea(W = 9, D = 7): Partes {
  const P = novo(), H = 4.2;
  corpo(P, W, D, H);
  porta(P, -W * 0.18, D / 2, 1);
  for (const x of [-W * 0.38, W * 0.12, W * 0.36]) janela(P, x, 2.1, D / 2 + 0.01, 1, 'z');
  for (const x of [-W * 0.25, W * 0.25]) janela(P, x, 2.1, -D / 2 - 0.01, -1, 'z');
  terreoPedra(P, W, D, 3.3, -W * 0.18, 1.45);
  telhado(P, W, D, H);
  caibros(P, W, D, H);
  chamine(P, W * 0.3, -D * 0.15, H);
  toldo(P, -W * 0.18, D, 2.2);
  tralha(P, W * 0.36, D, W * D);
  return P;
}

function sobrado(W = 10, D = 8, sacada = true, andares = 2): Partes {
  const P = novo(), H = andares === 3 ? 10.8 : 7.6;
  corpo(P, W, D, H);
  terreoPedra(P, W, D, 3.3);                                             // térreo de pedra
  enxaimel(P, W, D, 3.75, andares === 3 ? 7.0 : H - 0.2);                // madeira aparente em cima
  if (andares === 3) {
    caixa(P, 'moldura', W + 0.1, 0.16, D + 0.1, 0, 7.1, 0);
    for (const x of [-W * 0.32, 0, W * 0.32]) janela(P, x, 8.5, D / 2 + 0.01, 1, 'z');
    for (const x of [-W * 0.25, W * 0.25]) janela(P, x, 8.5, -D / 2 - 0.01, -1, 'z');
    // varanda corrida de madeira no 3º andar
    caixa(P, 'madeira', W - 0.6, 0.14, 1.1, 0, 7.25, D / 2 + 0.55);
    for (let i = 0; i < Math.floor(W / 0.35); i++) caixa(P, 'madeira', 0.05, 0.85, 0.05, -W / 2 + 0.45 + i * 0.35, 7.7, D / 2 + 1.05);
    caixa(P, 'madeira', W - 0.6, 0.08, 0.1, 0, 8.15, D / 2 + 1.05);
    for (const sx of [-1, 1]) caixa(P, 'madeira', 0.14, 0.14, 1.2, sx * (W / 2 - 0.6), 6.95, D / 2 + 0.45, 0.6);
  }
  caibros(P, W, D, H);
  chamine(P, -W * 0.32, -D * 0.2, H);
  if (andares === 3) { placa(P, W * 0.5 - 0.4, D, 3.0); toldo(P, -W * 0.3, D, 2.6); toldo(P, W * 0.3, D, 2.6); tralha(P, -W * 0.42, D, W); }
  else tralha(P, W * 0.42, D, W * 3);
  caixa(P, 'moldura', W + 0.1, 0.16, D + 0.1, 0, 3.6, 0);               // friso entre andares
  porta(P, 0, D / 2, 1, 1.4, 2.6);
  for (const x of [-W * 0.32, W * 0.32]) janela(P, x, 2.1, D / 2 + 0.01, 1, 'z');
  const xs = [-W * 0.32, 0, W * 0.32];
  for (const x of xs) {
    janela(P, x, 5.0, D / 2 + 0.01, 1, 'z', true);                      // janelas rasgadas do andar de cima
    if (sacada) {
      caixa(P, 'pedra', 1.6, 0.14, 0.7, x, 3.95, D / 2 + 0.35);
      for (let i = 0; i < 6; i++) caixa(P, 'madeira', 0.05, 0.9, 0.05, x - 0.7 + i * 0.28, 4.45, D / 2 + 0.66);
      caixa(P, 'madeira', 1.6, 0.07, 0.08, x, 4.92, D / 2 + 0.66);
    }
  }
  for (const x of [-W * 0.25, W * 0.25]) { janela(P, x, 2.1, -D / 2 - 0.01, -1, 'z'); janela(P, x, 5.0, -D / 2 - 0.01, -1, 'z'); }
  telhado(P, W, D, H, 0.45);
  return P;
}

function oficina(): Partes {
  const P = terrea(10, 7.5);
  caixa(P, 'pedra', 1.1, 3.2, 1.1, 2.6, 5.6, -1.2);                     // chaminé da forja
  placa(P, -10 * 0.18 + 1.6, 7.5, 3.1);
  caixa(P, 'ferro', 0.9, 0.35, 0.4, 3.2, 0.95, 4.6); caixa(P, 'madeira', 0.5, 0.8, 0.5, 3.2, 0.4, 4.6);   // bigorna na porta
  return P;
}

function ruina(): Partes {
  const P = novo(), W = 7, D = 5.5;
  caixa(P, 'pedra', W + 0.12, 0.6, D + 0.12, 0, 0.3, 0);
  caixa(P, 'parede', W, 2.6, 0.4, 0, 1.9, D / 2 - 0.2);
  caixa(P, 'parede', 0.4, 1.8, D, -W / 2 + 0.2, 1.5, 0);
  caixa(P, 'parede', 2.6, 1.2, 0.4, W / 2 - 1.3, 1.2, -D / 2 + 0.2);
  for (let i = 0; i < 5; i++) caixa(P, 'madeira', 0.2, 0.2, 4 + i * 0.4, -2 + i, 0.8 + (i % 2) * 0.5, 0, 0.3 * i, 0.6 * i, 0.4);  // vigas caídas
  janela(P, 1.5, 2.0, D / 2 + 0.01, 1, 'z');
  return P;
}

// Igreja barroca mineira: nave, frontispício com frontão, duas torres com cúpulas, óculo e portada
function igreja(): Partes {
  const P = novo(), W = 10, D = 17, H = 9;
  corpo(P, D, W, H);                                                     // feito de lado e girado abaixo: a nave fica no eixo Z
  telhado(P, D, W, H, 0.55);
  // gira tudo que já foi feito 90° para a nave ficar no eixo Z
  for (const k of Object.keys(P) as Mat[]) P[k] = P[k].map((g) => g.rotateY(Math.PI / 2));
  const fz = D / 2;
  caixa(P, 'parede', W + 0.6, 4.2, 0.8, 0, H + 1.6, fz);                 // frontispício alto
  const fr = new THREE.Shape([new THREE.Vector2(-W / 2 + 0.6, 0), new THREE.Vector2(W / 2 - 0.6, 0), new THREE.Vector2(0, 2.8)]);
  const g = new THREE.ExtrudeGeometry(fr, { depth: 0.8, bevelEnabled: false }); g.translate(0, H + 3.7, fz - 0.4); P.parede.push(uvMundo(g, TILE.parede));
  caixa(P, 'moldura', 0.3, 3.2, 0.3, 0, H + 7.1, fz);                    // cruz
  caixa(P, 'moldura', 1.3, 0.3, 0.3, 0, H + 7.8, fz);
  for (const sx of [-1, 1]) {
    const tx = sx * (W / 2 + 1.1);
    caixa(P, 'pedra', 3.3, 0.7, 3.3, tx, 0.35, fz - 1.2);
    caixa(P, 'parede', 3, H + 5.5, 3, tx, (H + 5.5) / 2 + 0.5, fz - 1.2);
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) caixa(P, 'moldura', 0.32, H + 5.5, 0.32, tx + cx * 1.4, (H + 5.5) / 2 + 0.5, fz - 1.2 + cz * 1.4);
    caixa(P, 'moldura', 3.5, 0.35, 3.5, tx, H + 6.1, fz - 1.2);
    janela(P, tx, H + 3.6, fz - 1.2 + 1.51, 1, 'z', true);              // sineira
    const cup = new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); cup.translate(tx, H + 6.25, fz - 1.2); P.telha.push(uvMundo(cup, TILE.telha));
    const pin = new THREE.ConeGeometry(0.35, 1.4, 8); pin.translate(tx, H + 8.2, fz - 1.2); P.moldura.push(uvMundo(pin, 1));
  }
  porta(P, 0, fz + 0.4, 1, 2.2, 4.0);
  const oc = new THREE.CylinderGeometry(0.75, 0.75, 0.1, 20); oc.rotateX(Math.PI / 2); oc.translate(0, H + 1.4, fz + 0.42); P.vidro.push(uvMundo(oc, 1));
  const ocm = new THREE.TorusGeometry(0.85, 0.12, 6, 20); ocm.translate(0, H + 1.4, fz + 0.45); P.moldura.push(uvMundo(ocm, 1));
  for (const x of [-3, 3]) janela(P, x, 6.2, fz + 0.41, 1, 'z', true);
  for (const z of [-5, 0, 5]) for (const s of [1, -1] as const) janela(P, s * (W / 2 + 0.01), 5.5, z, s, 'x', true);
  return P;
}

const MODELOS: Record<TipoCasa, () => Partes> = {
  terrea: () => terrea(), sobrado: () => sobrado(), venda: () => sobrado(12.5, 9, true, 3), oficina, ruina, igreja,
};

const URLS = Object.fromEntries((['parede', 'telha', 'madeira', 'pedra'] as const).flatMap((k) => [[`${k}_cor`, textura(`casa/${k}_cor.jpg`)], [`${k}_nor`, textura(`casa/${k}_nor.jpg`)]])) as Record<string, string>;

// Cores das molduras e cunhais (típicas de Ouro Preto) e das paredes
const MOLDURAS = ['#2f5d8a', '#3f6e4a', '#c9a23a', '#7a2f2a', '#3b4f73', '#2f5d8a', '#6b4a2b'].map((c) => new THREE.Color(c));
const PAREDES = ['#ffffff', '#ffffff', '#ffffff', '#f3e3b5', '#f7f0e2', '#e9cfa0'].map((c) => new THREE.Color(c));

// Paredes com cara de antigas: barra de sujeira e umidade perto do chão, manchas e escorridos de chuva
function envelhecer(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vLocal;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ float horiz = vLocal.x + vLocal.z;
  float base = smoothstep(0.5, 2.2, vLocal.y + rn(vec2(horiz * 1.3, 0.0)) * 0.7);      // sujeira e umidade embaixo
  float escorre = smoothstep(0.55, 0.95, rn(vec2(horiz * 3.0, vLocal.y * 0.35))) * smoothstep(1.5, 4.5, vLocal.y);
  float mancha = rn(vec2(horiz, vLocal.y) * 0.6);
  diffuseColor.rgb *= mix(0.55, 1.0, base) * (1.0 - escorre * 0.22) * mix(0.86, 1.04, mancha); }`);
  };
  return m;
}

function Tipo({ tipo, lista, tex, sombra }: { tipo: TipoCasa; lista: CasaPos[]; tex: Record<string, THREE.Texture>; sombra: boolean }) {
  const geos = useMemo(() => {
    const P = MODELOS[tipo]();
    // deixa todas as peças com os mesmos atributos (posição, normal, uv) antes de juntar
    const limpa = (x: THREE.BufferGeometry) => {
      const n = x.index ? x.toNonIndexed() : x;
      for (const nome of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(nome)) n.deleteAttribute(nome);
      n.clearGroups(); return n;
    };
    return Object.fromEntries((Object.keys(P) as Mat[]).filter((k) => P[k].length).flatMap((k) => {
      const g = mergeGeometries(P[k].map(limpa));
      if (!g) { console.warn('casa: não juntou', tipo, k); return []; }
      g.computeVertexNormals(); return [[k, g]];
    })) as Partial<Record<Mat, THREE.BufferGeometry>>;
  }, [tipo]);
  const mats = useMemo(() => {
    const ruina = tipo === 'ruina';
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
    return {
      parede: envelhecer(std({ map: tex.parede_cor, normalMap: tex.parede_nor, color: ruina ? new THREE.Color(0.35, 0.32, 0.3) : new THREE.Color(1.3, 1.28, 1.22) })),
      telha: std({ map: tex.telha_cor, normalMap: tex.telha_nor, roughness: 0.75 }),
      madeira: std({ map: tex.madeira_cor, normalMap: tex.madeira_nor, color: ruina ? new THREE.Color(0.15, 0.12, 0.1) : new THREE.Color('#9a6a42') }),
      pedra: std({ map: tex.pedra_cor, normalMap: tex.pedra_nor, color: ruina ? new THREE.Color(0.5, 0.5, 0.5) : new THREE.Color(1, 1, 1) }),
      moldura: std({ map: tex.parede_cor, roughness: 0.6, color: ruina ? new THREE.Color(0.25, 0.22, 0.2) : new THREE.Color(1, 1, 1) }),
      vidro: std({ color: '#1d2630', roughness: 0.15, metalness: 0.3 }),
      luz: new THREE.MeshStandardMaterial({ color: '#3a2412', emissive: new THREE.Color(ruina ? '#000' : '#ff9a45'), emissiveIntensity: ruina ? 0 : 1.4, roughness: 1 }),
      planta: std({ color: '#3d7a33', roughness: 1 }),
      tecido: std({ map: tex.parede_cor, color: ruina ? new THREE.Color('#2a1c14') : new THREE.Color('#b0392b'), roughness: 1, side: THREE.DoubleSide }),
      ferro: std({ color: '#2b2b2e', metalness: 0.7, roughness: 0.45 }),
      flor: std({ color: '#c8324a', roughness: 1, emissive: new THREE.Color('#3a0710'), emissiveIntensity: 0.4 }),
    } as Record<Mat, THREE.MeshStandardMaterial>;
  }, [tex, tipo]);
  const refs = useRef<Partial<Record<Mat, THREE.InstancedMesh | null>>>({});
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), y = new THREE.Vector3(0, 1, 0);
    for (const [k, im] of Object.entries(refs.current) as [Mat, THREE.InstancedMesh | null][]) {
      if (!im) continue;
      lista.forEach((c, i) => {
        im.setMatrixAt(i, m.compose(new THREE.Vector3(...c.p), q.setFromAxisAngle(y, c.r), new THREE.Vector3(c.s, c.s, c.s)));
        if (k === 'moldura' && tipo !== 'ruina') im.setColorAt(i, tipo === 'igreja' ? new THREE.Color('#d8c9a0') : MOLDURAS[(i * 5 + 3) % MOLDURAS.length]);
        if (k === 'parede' && tipo !== 'ruina' && tipo !== 'igreja') im.setColorAt(i, PAREDES[(i * 7 + 1) % PAREDES.length]);
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    }
  }, [lista, geos, tipo]);
  if (!lista.length) return null;
  return <>{(Object.keys(geos) as Mat[]).map((k) => (
    <instancedMesh key={k} ref={(r) => { refs.current[k] = r; }} args={[geos[k]!, mats[k], lista.length]} castShadow={sombra} receiveShadow frustumCulled={false} />
  ))}</>;
}

export function Casas({ lista, sombra = true }: { lista: CasaPos[]; sombra?: boolean }) {
  const tex = useTexture(URLS) as unknown as Record<string, THREE.Texture>;
  useLayoutEffect(() => {
    for (const [k, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      t.colorSpace = k.endsWith('_nor') ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.needsUpdate = true;
    }
  }, [tex]);
  const porTipo = useMemo(() => {
    const out: Record<TipoCasa, CasaPos[]> = { terrea: [], sobrado: [], venda: [], oficina: [], ruina: [], igreja: [] };
    lista.forEach((c) => out[c.tipo].push(c));
    return out;
  }, [lista]);
  return <>{(Object.keys(porTipo) as TipoCasa[]).map((t) => <Tipo key={t} tipo={t} lista={porTipo[t]} tex={tex} sombra={sombra} />)}</>;
}
