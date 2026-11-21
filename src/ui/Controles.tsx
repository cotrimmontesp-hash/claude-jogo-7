// Controles de toque para celular.
// • Dedo no lado esquerdo: joystick (aparece onde você encosta)
// • Dedo no lado direito: gira a câmera na hora, igual ao mouse no PC
// • Funciona com vários dedos ao mesmo tempo (andar + girar + atacar)
import React, { useEffect, useRef, useState } from 'react';
import { View, PanResponder, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { entrada } from '../game/input';
import { useJogo } from '../state/store';

const RAIO = 44;
const SENS_TOQUE = 1.9;   // quanto a câmera gira por pixel arrastado (multiplica a sensibilidade das Configurações)

type Botao = 'pular' | 'atacar' | 'furtivo' | 'interagir' | 'visaoAguia';

function BotaoAcao({ txt, k, grande }: { txt: string; k: Botao; grande?: boolean }) {
  return (
    <Pressable onPressIn={() => (entrada[k] = true)} onPressOut={() => (entrada[k] = false)} style={[s.btn, grande && s.btnG]}
      // @ts-ignore — marca para o controle de toque da web ignorar este dedo
      dataSet={{ botao: '1' }}>
      <Text style={s.btnTxt}>{txt}</Text>
    </Pressable>
  );
}

// ---------- Web / PWA (celular): toques múltiplos de verdade ----------
// Botões em arco em volta do ATACAR, com ícone e nome (posição a partir do canto inferior direito)
const BOTOES: { k: Botao; txt: string; nome: string; tam: number; right: number; bottom: number; cor: string }[] = [
  { k: 'atacar', txt: '⚔️', nome: 'ATACAR', tam: 76, right: 22, bottom: 22, cor: '#a83226' },
  { k: 'pular', txt: '⬆️', nome: 'PULAR', tam: 52, right: 108, bottom: 14, cor: '#2c5d8f' },
  { k: 'furtivo', txt: '🥷', nome: 'AGACHAR', tam: 48, right: 116, bottom: 76, cor: '#3d3d46' },
  { k: 'interagir', txt: '🐎', nome: 'USAR', tam: 46, right: 82, bottom: 132, cor: '#5b7a2f' },
  { k: 'visaoAguia', txt: '🦅', nome: 'VISÃO', tam: 46, right: 20, bottom: 114, cor: '#8a6420' },
];

function BotaoVisual({ b, apertado, id }: { b: (typeof BOTOES)[number]; apertado?: boolean; id?: string }) {
  return (
    <View nativeID={id} pointerEvents={id ? 'auto' : 'none'} style={[s.botao, {
      width: b.tam, height: b.tam, borderRadius: b.tam / 2, right: b.right, bottom: b.bottom,
      backgroundColor: apertado ? '#e8b64acc' : b.cor + 'cc', transform: [{ scale: apertado ? 0.9 : 1 }],
    }]}>
      <Text selectable={false} style={[s.botaoIcone, { fontSize: b.tam * 0.34 }]}>{b.txt}</Text>
      <Text selectable={false} style={[s.botaoNome, { fontSize: b.tam > 70 ? 10 : 8 }]}>{b.nome}</Text>
    </View>
  );
}

function ControlesWeb() {
  const [joy, setJoy] = useState<{ cx: number; cy: number; kx: number; ky: number } | null>(null);
  const [apertados, setApertados] = useState<Record<string, boolean>>({});
  const dedos = useRef(new Map<number, { tipo: 'joy' | 'cam' | 'botao'; cx: number; cy: number; lx: number; ly: number; botao?: Botao }>());

  useEffect(() => {
    // só os dedos que encostam direto na tela do jogo (o 3D); botões e menus continuam funcionando normalmente
    const ehBotao = (el: EventTarget | null) => (el as HTMLElement)?.tagName !== 'CANVAS' || !!(el as HTMLElement)?.closest?.('[data-botao]');
    const botaoDe = (el: EventTarget | null) => {
      const id = (el as HTMLElement)?.closest?.('[id^="botao-"]')?.id; return id ? (id.slice(6) as Botao) : null;
    };
    const inicio = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const b = botaoDe(t.target);
        if (b) {                                              // dedo em um botão de ação
          entrada[b] = true; setApertados((a) => ({ ...a, [b]: true }));
          dedos.current.set(t.identifier, { tipo: 'botao', botao: b, cx: 0, cy: 0, lx: 0, ly: 0 });
          e.preventDefault(); continue;
        }
        if (ehBotao(t.target)) continue;                      // pausa, clã e menus: funcionam normalmente
        const esquerda = t.clientX < window.innerWidth * 0.42;
        dedos.current.set(t.identifier, { tipo: esquerda ? 'joy' : 'cam', cx: t.clientX, cy: t.clientY, lx: t.clientX, ly: t.clientY });
        if (esquerda) setJoy({ cx: t.clientX, cy: t.clientY, kx: 0, ky: 0 });
      }
      if (dedos.current.size) e.preventDefault();
    };
    const mover = (e: TouchEvent) => {
      const sens = useJogo.getState().config.sensibilidade;
      for (const t of Array.from(e.changedTouches)) {
        const d = dedos.current.get(t.identifier); if (!d || d.tipo === 'botao') continue;
        if (d.tipo === 'cam') {
          entrada.olhar.dx += (t.clientX - d.lx) * SENS_TOQUE * sens;
          entrada.olhar.dy += (t.clientY - d.ly) * SENS_TOQUE * sens;
          d.lx = t.clientX; d.ly = t.clientY;
        } else {
          let dx = t.clientX - d.cx, dy = t.clientY - d.cy;
          const dist = Math.hypot(dx, dy);
          if (dist > RAIO) { dx *= RAIO / dist; dy *= RAIO / dist; }
          entrada.mover = { x: dx / RAIO, y: -dy / RAIO };
          entrada.correr = dist > RAIO * 0.92;
          setJoy({ cx: d.cx, cy: d.cy, kx: dx, ky: dy });
        }
      }
      e.preventDefault();
    };
    const fim = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const d = dedos.current.get(t.identifier); if (!d) continue;
        if (d.tipo === 'joy') { entrada.mover = { x: 0, y: 0 }; entrada.correr = false; setJoy(null); }
        if (d.tipo === 'botao' && d.botao) {
          // toque rápido: segura o botão por pelo menos 1/8 de segundo para o jogo não perder o aperto
          const b = d.botao; setApertados((a) => ({ ...a, [b]: false }));
          setTimeout(() => { if (![...dedos.current.values()].some((x) => x.botao === b)) entrada[b] = false; }, 130);
        }
        dedos.current.delete(t.identifier);
      }
      // segurança: se não sobrou nenhum dedo na tela, solta tudo
      if (e.touches.length === 0) {
        dedos.current.clear(); entrada.mover = { x: 0, y: 0 }; entrada.correr = false; setJoy(null);
        for (const b of BOTOES) entrada[b.k] = false; setApertados({});
      }
    };
    const opts = { passive: false } as AddEventListenerOptions;
    window.addEventListener('touchstart', inicio, opts);
    window.addEventListener('touchmove', mover, opts);
    window.addEventListener('touchend', fim); window.addEventListener('touchcancel', fim);
    return () => {
      window.removeEventListener('touchstart', inicio); window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', fim); window.removeEventListener('touchcancel', fim);
      entrada.mover = { x: 0, y: 0 }; entrada.correr = false;
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* joystick: aparece onde o dedo encosta; quando solto, mostra onde fica */}
      <View pointerEvents="none" style={[s.joy, joy ? { left: joy.cx - (RAIO + 15), top: joy.cy - (RAIO + 15), bottom: undefined, opacity: 1 } : { opacity: 0.55 }]}>
        <View style={[s.knob, { transform: [{ translateX: joy?.kx ?? 0 }, { translateY: joy?.ky ?? 0 }] }]} />
      </View>
      {!joy && <Text pointerEvents="none" style={s.dicaCam}>arraste aqui para girar a câmera →</Text>}
      <View style={s.areaBotoes} pointerEvents="box-none">
        {BOTOES.map((b) => <BotaoVisual key={b.k} b={b} apertado={apertados[b.k]} id={`botao-${b.k}`} />)}
      </View>
    </View>
  );
}

// ---------- Android / iPhone (app nativo) ----------
function ControlesNativo() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const ultimo = useRef({ x: 0, y: 0 });
  const joy = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const d = Math.min(RAIO, Math.hypot(g.dx, g.dy)); const a = Math.atan2(g.dy, g.dx);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      setKnob({ x, y }); entrada.mover = { x: x / RAIO, y: -y / RAIO }; entrada.correr = d > RAIO * 0.92;
    },
    onPanResponderRelease: () => { setKnob({ x: 0, y: 0 }); entrada.mover = { x: 0, y: 0 }; entrada.correr = false; },
  })).current;
  const camera = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { ultimo.current = { x: 0, y: 0 }; },
    onPanResponderMove: (_, g) => {
      const sens = useJogo.getState().config.sensibilidade;
      entrada.olhar.dx += (g.dx - ultimo.current.x) * SENS_TOQUE * sens;
      entrada.olhar.dy += (g.dy - ultimo.current.y) * SENS_TOQUE * sens;
      ultimo.current = { x: g.dx, y: g.dy };
    },
  })).current;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={s.areaCamera} {...camera.panHandlers} />
      <View style={s.joy} {...joy.panHandlers}>
        <View style={[s.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>
      <View style={s.areaBotoes} pointerEvents="box-none">
        {BOTOES.map((b) => (
          <Pressable key={b.k} onPressIn={() => (entrada[b.k] = true)} onPressOut={() => setTimeout(() => (entrada[b.k] = false), 130)}
            style={{ position: 'absolute', right: b.right, bottom: b.bottom, width: b.tam, height: b.tam }}>
            {({ pressed }) => <BotaoVisual b={{ ...b, right: 0, bottom: 0 }} apertado={pressed} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Controles() {
  if (Platform.OS === 'web') {
    if (!('ontouchstart' in globalThis)) return null;   // PC usa teclado e mouse
    return <ControlesWeb />;
  }
  return <ControlesNativo />;
}

const s = StyleSheet.create({
  areaCamera: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%' },
  joy: { position: 'absolute', left: 30, bottom: 30, width: RAIO * 2 + 30, height: RAIO * 2 + 30, borderRadius: 999, backgroundColor: '#0005', borderWidth: 2, borderColor: '#e8b64a66', alignItems: 'center', justifyContent: 'center' },
  knob: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e8b64acc' },
  dicaCam: { position: 'absolute', right: 240, bottom: 30, color: '#f3eadb99', fontSize: 12 },
  botoes: { position: 'absolute', right: 30, bottom: 30, width: 200, flexDirection: 'row', flexWrap: 'wrap-reverse', gap: 10, justifyContent: 'flex-end' },
  areaBotoes: { position: 'absolute', right: 0, bottom: 0, width: 220, height: 215 },
  botao: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#f3d48aaa',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  botaoIcone: { color: '#fff', lineHeight: undefined as any, pointerEvents: 'none' } as any,
  botaoNome: { color: '#fff', fontWeight: '900', letterSpacing: 0.5, marginTop: 1, textShadowColor: '#000', textShadowRadius: 3, pointerEvents: 'none' } as any,
  btn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#0007', borderWidth: 2, borderColor: '#e8b64a88', alignItems: 'center', justifyContent: 'center' },
  btnG: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#8a2a20cc' },
  btnTxt: { color: '#fff', fontSize: 22, pointerEvents: 'none' } as any,
  btnApertado: { transform: [{ scale: 0.9 }], backgroundColor: '#e8b64a99' },
});
