// Efeitos de ambiente: vento (grama e árvores), água com ondas, vaga-lumes e partículas no ar.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from './r3f';
import { useTexture } from './drei';
import { textura } from './modelos';
import { altura, distEstrada, distRio, ALTURA_AGUA, TAM_MUNDO } from './Terreno';
import { jogadorPos } from './Mundo';
import { useJogo } from '../state/store';

// relógio do vento compartilhado por todos os materiais
export const vento = { uniform: { value: 0 } };

// Faz qualquer material balançar com o vento (mais no topo do objeto). Funciona com instancing.
export function aplicarVento(mat: THREE.Material, forca = 0.05, alturaRef = 1, outono = false) {
  const m = mat.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTempo = vento.uniform;
    sh.vertexShader = 'uniform float uTempo;\nvarying float vOut;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float h = clamp(position.y / ${alturaRef.toFixed(2)}, 0.0, 1.0);
      #ifdef USE_INSTANCING
        vec2 base = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
      #else
        vec2 base = vec2(0.0);
      #endif
      float onda = sin(uTempo * 1.7 + base.x * 0.15 + base.y * 0.11) + 0.4 * sin(uTempo * 3.1 + base.x * 0.4);
      transformed.x += onda * ${forca.toFixed(3)} * h * h;
      transformed.z += onda * ${(forca * 0.6).toFixed(3)} * h * h;
      vOut = fract(sin(dot(base, vec2(12.9898, 78.233))) * 43758.5453);`);
    if (outono) {
      // ~45% das árvores ganham folhas de outono (laranja, vermelho, amarelo), como nas paisagens do trailer
      sh.fragmentShader = 'varying float vOut;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float verde = step(diffuseColor.r * 1.05, diffuseColor.g) * step(diffuseColor.b, diffuseColor.g);
        vec3 cor = mix(vec3(0.98, 0.46, 0.08), vec3(0.82, 0.16, 0.07), step(0.5, fract(vOut * 3.7)));
        cor = mix(cor, vec3(0.98, 0.78, 0.16), step(0.66, fract(vOut * 7.1)));
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, cor * lum * 2.3, verde * step(0.55, vOut));`);
    }
  };
  m.customProgramCacheKey = () => `vento${forca}${alturaRef}${outono}`;
  return m;
}

export function RelogioVento() { useFrame((_, dt) => { vento.uniform.value += dt; }); return null; }

// ---------- Grama alta em volta do jogador ----------
export function Grama({ quantidade }: { quantidade: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const centro = useRef(new THREE.Vector3(1e9, 0, 0));
  const RAIO = 32;
  const geo = useMemo(() => {
    // tufo: 3 lâminas cruzadas, mais finas no topo
    const g = new THREE.BufferGeometry();
    const v: number[] = [], uv: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI, c = Math.cos(a) * 0.09, s = Math.sin(a) * 0.09;
      v.push(-c, 0, -s, c, 0, s, 0, 0.75, 0);
      uv.push(0, 0, 1, 0, 0.5, 1);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.9 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTempo = vento.uniform;
      sh.vertexShader = 'uniform float uTempo;\nvarying float vAlt;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vAlt = position.y / 0.75;
        vec2 b = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
        float o = sin(uTempo * 2.2 + b.x * 0.35 + b.y * 0.27) * 0.5 + sin(uTempo * 4.0 + b.x) * 0.15;
        transformed.x += o * 0.22 * vAlt * vAlt; transformed.z += o * 0.12 * vAlt * vAlt;`);
      // base mais escura, ponta mais clara (dá volume)
      sh.fragmentShader = 'varying float vAlt;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.45, 1.15, vAlt);');
    };
    return m;
  }, []);

  useFrame(() => {
    const im = ref.current; if (!im) return;
    if (centro.current.distanceTo(jogadorPos) < 10) return;      // só redistribui quando o jogador se afasta
    centro.current.copy(jogadorPos);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), cor = new THREE.Color();
    const base = new THREE.Color('#6f9a3e'), clara = new THREE.Color('#a9c45a'), seca = new THREE.Color('#b9a45a');
    // grade fixa no mundo com variação por "hash": a grama não muda de lugar quando você anda
    const passo = (RAIO * 2) / Math.sqrt(quantidade);
    const cx = centro.current.x, cz = centro.current.z;
    let n = 0;
    for (let gx = Math.floor((cx - RAIO) / passo); gx <= Math.ceil((cx + RAIO) / passo) && n < quantidade; gx++) {
      for (let gz = Math.floor((cz - RAIO) / passo); gz <= Math.ceil((cz + RAIO) / passo) && n < quantidade; gz++) {
        const hs = Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453, f1 = hs - Math.floor(hs);
        const hs2 = Math.sin(gx * 39.346 + gz * 11.135) * 24634.6345, f2 = hs2 - Math.floor(hs2);
        const x = (gx + f1) * passo, z = (gz + f2) * passo;
        if (Math.hypot(x - cx, z - cz) > RAIO) continue;
        if (distEstrada(x, z) < 2.5 || distRio(x, z) < 7 || Math.hypot(x, z) < 12 || f1 * f2 > 0.7) continue;
        p.set(x, altura(x, z) - 0.05, z);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f2 * 6.28);
        const tam = 0.7 + f1 * 1.0; s.set(tam, tam * (0.8 + f2 * 0.6), tam);
        im.setMatrixAt(n, m.compose(p, q, s));
        im.setColorAt(n, cor.copy(base).lerp(f1 > 0.85 ? seca : clara, f2 * 0.7));
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  useLayoutEffect(() => { const im = ref.current; if (im && !im.instanceColor) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(quantidade * 3).fill(1), 3); }, [quantidade]);
  return <instancedMesh ref={ref} args={[geo, mat, quantidade]} frustumCulled={false} receiveShadow />;
}

// ---------- Água: ondas com reflexo do céu ----------
export function Agua() {
  const normal = useTexture(textura('agua_normal.jpg'));
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useLayoutEffect(() => { normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.repeat.set(6, 60); }, [normal]);
  useFrame((_, dt) => { normal.offset.y += dt * 0.02; normal.offset.x += dt * 0.004; });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[70, ALTURA_AGUA, 0]} receiveShadow>
      <planeGeometry args={[40, TAM_MUNDO, 1, 1]} />
      <meshStandardMaterial ref={mat} color="#2f6f8f" normalMap={normal} normalScale={new THREE.Vector2(0.6, 0.6)}
        roughness={0.05} metalness={0.6} transparent opacity={0.86} envMapIntensity={1.4} />
    </mesh>
  );
}

// ---------- Vaga-lumes (noite) e poeira dourada (dia) ----------
export function Particulas() {
  const ref = useRef<THREE.Points>(null);
  const N = 260;
  const base = useMemo(() => Float32Array.from({ length: N * 3 }, () => (Math.random() - 0.5)), []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); return g; }, []);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.14, color: '#ffe08a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, pos = geo.attributes.position as THREE.BufferAttribute;
    const h = useJogo.getState().progresso?.horaDoDia ?? 12, noite = h > 18.5 || h < 5.5;
    mat.color.set(noite ? '#c8ff6a' : '#fff1c4'); mat.opacity = noite ? 0.6 + Math.sin(t * 3) * 0.3 : 0.35; mat.size = noite ? 0.18 : 0.06;
    for (let i = 0; i < N; i++) {
      const x = jogadorPos.x + base[i * 3] * 50 + Math.sin(t * 0.3 + i) * 1.5;
      const z = jogadorPos.z + base[i * 3 + 2] * 50 + Math.cos(t * 0.27 + i) * 1.5;
      pos.setXYZ(i, x, altura(x, z) + 0.6 + (base[i * 3 + 1] + 0.5) * 3 + Math.sin(t + i) * 0.4, z);
    }
    pos.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
