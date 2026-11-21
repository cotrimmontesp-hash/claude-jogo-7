// Web/PWA no celular: força o jogo deitado (tela cheia + trava em paisagem).
// Se o navegador não deixar travar, mostra um aviso pedindo para girar o celular.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { cores } from './tema';

const ehCelular = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const emPe = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

export async function deitarTela() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    const el: any = document.documentElement;
    if (!document.fullscreenElement) await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
    await (screen.orientation as any)?.lock?.('landscape');
  } catch { /* alguns navegadores (iPhone) não deixam: o aviso pede para girar */ }
}

export function Orientacao() {
  const [vertical, setVertical] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || !ehCelular()) return;
    const ver = () => setVertical(emPe());
    ver();
    window.addEventListener('resize', ver);
    // primeiro toque em qualquer lugar já tenta deitar a tela
    const primeiro = () => { deitarTela(); window.removeEventListener('pointerup', primeiro); };
    window.addEventListener('pointerup', primeiro);
    return () => { window.removeEventListener('resize', ver); window.removeEventListener('pointerup', primeiro); };
  }, []);
  if (!vertical) return null;
  return (
    <View style={s.fundo}>
      <Text style={s.icone}>📱↻</Text>
      <Text style={s.titulo}>Jogue com o celular deitado</Text>
      <Text style={s.texto}>Toque no botão para abrir em tela cheia na horizontal. Se não girar sozinho, desative a "rotação travada" do celular e vire ele.</Text>
      <Pressable style={s.botao} onPress={deitarTela}><Text style={s.botaoTxt}>DEITAR A TELA</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  fundo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#120d08f2', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14, zIndex: 999 },
  icone: { fontSize: 64, color: cores.ouro },
  titulo: { color: cores.ouro, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  texto: { color: cores.texto, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  botao: { backgroundColor: cores.ouro, paddingHorizontal: 30, paddingVertical: 16, borderRadius: 12, marginTop: 10 },
  botaoTxt: { color: cores.fundo, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
});
