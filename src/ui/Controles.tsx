// Controles de toque para celular.
// • Dedo no lado esquerdo: joystick (aparece onde você encosta)
// • Dedo no lado direito: gira a câmera na hora, igual ao mouse no PC
// • Funciona com vários dedos ao mesmo tempo (andar + girar + atacar)
import React, { useEffect, useRef, useState } from 'react';
import { View, PanResponder, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { entrada } from '../game/input';
import { useJogo } from '../state/store';

const RAIO = 55;
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
function ControlesWeb() {
  const [joy, setJoy] = useState<{ cx: number; cy: number; kx: number; ky: number } | null>(null);
  const dedos = useRef(new Map<number, { tipo: 'joy' | 'cam'; cx: number; cy: number; lx: number; ly: number }>());

  useEffect(() => {
    // só os dedos que encostam direto na tela do jogo (o 3D); botões e menus continuam funcionando normalmente
    const ehBotao = (el: EventTarget | null) => (el as HTMLElement)?.tagName !== 'CANVAS' || !!(el as HTMLElement)?.closest?.('[data-botao]');
    const inicio = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (ehBotao(t.target)) continue;
        const esquerda = t.clientX < window.innerWidth * 0.42;
        dedos.current.set(t.identifier, { tipo: esquerda ? 'joy' : 'cam', cx: t.clientX, cy: t.clientY, lx: t.clientX, ly: t.clientY });
        if (esquerda) setJoy({ cx: t.clientX, cy: t.clientY, kx: 0, ky: 0 });
      }
      if (dedos.current.size) e.preventDefault();
    };
    const mover = (e: TouchEvent) => {
      const sens = useJogo.getState().config.sensibilidade;
      for (const t of Array.from(e.changedTouches)) {
        const d = dedos.current.get(t.identifier); if (!d) continue;
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
        dedos.current.delete(t.identifier);
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
      <View style={s.botoes} pointerEvents="box-none">
        <BotaoAcao txt="⚔" k="atacar" grande />
        <BotaoAcao txt="⤒" k="pular" />
        <BotaoAcao txt="🫥" k="furtivo" />
        <BotaoAcao txt="✋" k="interagir" />
        <BotaoAcao txt="👁" k="visaoAguia" />
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
      <View style={s.botoes} pointerEvents="box-none">
        <BotaoAcao txt="⚔" k="atacar" grande />
        <BotaoAcao txt="⤒" k="pular" />
        <BotaoAcao txt="🫥" k="furtivo" />
        <BotaoAcao txt="✋" k="interagir" />
        <BotaoAcao txt="👁" k="visaoAguia" />
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
  joy: { position: 'absolute', left: 40, bottom: 40, width: RAIO * 2 + 30, height: RAIO * 2 + 30, borderRadius: 999, backgroundColor: '#0005', borderWidth: 2, borderColor: '#e8b64a66', alignItems: 'center', justifyContent: 'center' },
  knob: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8b64acc' },
  dicaCam: { position: 'absolute', right: 250, bottom: 30, color: '#f3eadb99', fontSize: 12 },
  botoes: { position: 'absolute', right: 30, bottom: 30, width: 200, flexDirection: 'row', flexWrap: 'wrap-reverse', gap: 10, justifyContent: 'flex-end' },
  btn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#0007', borderWidth: 2, borderColor: '#e8b64a88', alignItems: 'center', justifyContent: 'center' },
  btnG: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#8a2a20cc' },
  btnTxt: { color: '#fff', fontSize: 22 },
});
