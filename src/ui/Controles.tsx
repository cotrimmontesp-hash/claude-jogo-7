// Joystick e botões na tela para celular.
import React, { useRef, useState } from 'react';
import { View, PanResponder, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { entrada } from '../game/input';

const RAIO = 55;

export function Controles() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joy = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const d = Math.min(RAIO, Math.hypot(g.dx, g.dy)); const a = Math.atan2(g.dy, g.dx);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      setKnob({ x, y }); entrada.mover = { x: x / RAIO, y: -y / RAIO }; entrada.correr = d > RAIO * 0.9;
    },
    onPanResponderRelease: () => { setKnob({ x: 0, y: 0 }); entrada.mover = { x: 0, y: 0 }; entrada.correr = false; },
  })).current;

  const camera = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { entrada.olhar.dx += g.vx * 8; entrada.olhar.dy += g.vy * 8; },
  })).current;

  if (Platform.OS === 'web' && !('ontouchstart' in globalThis)) return null; // PC usa teclado/mouse

  const B = ({ txt, k, grande }: { txt: string; k: 'pular' | 'atacar' | 'furtivo' | 'interagir' | 'visaoAguia'; grande?: boolean }) => (
    <Pressable onPressIn={() => (entrada[k] = true)} onPressOut={() => (entrada[k] = false)} style={[s.btn, grande && s.btnG]}>
      <Text style={s.btnTxt}>{txt}</Text>
    </Pressable>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={s.areaCamera} {...camera.panHandlers} />
      <View style={s.joy} {...joy.panHandlers}>
        <View style={[s.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>
      <View style={s.botoes}>
        <B txt="⚔" k="atacar" grande />
        <B txt="⤒" k="pular" />
        <B txt="🫥" k="furtivo" />
        <B txt="✋" k="interagir" />
        <B txt="👁" k="visaoAguia" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  areaCamera: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' },
  joy: { position: 'absolute', left: 40, bottom: 40, width: RAIO * 2 + 30, height: RAIO * 2 + 30, borderRadius: 999, backgroundColor: '#0005', borderWidth: 2, borderColor: '#e8b64a66', alignItems: 'center', justifyContent: 'center' },
  knob: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8b64acc' },
  botoes: { position: 'absolute', right: 30, bottom: 30, width: 200, flexDirection: 'row', flexWrap: 'wrap-reverse', gap: 10, justifyContent: 'flex-end' },
  btn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#0007', borderWidth: 2, borderColor: '#e8b64a88', alignItems: 'center', justifyContent: 'center' },
  btnG: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#8a2a20cc' },
  btnTxt: { color: '#fff', fontSize: 22 },
});
