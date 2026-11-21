import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

export const cores = {
  fundo: '#120d08', painel: '#1f1710e6', ouro: '#e8b64a', ouroEscuro: '#8a6420',
  texto: '#f3eadb', textoFraco: '#a89a85', vermelho: '#b8342a', verde: '#4caf50', azul: '#3a8ad6',
};

export function Botao({ texto, onPress, ativo, grande, estilo }: { texto: string; onPress?: () => void; ativo?: boolean; grande?: boolean; estilo?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.b, ativo && s.ativo, grande && s.grande, pressed && { opacity: 0.7 }, estilo]}>
      <Text style={[s.t, grande && s.tg, ativo && { color: cores.fundo }]}>{texto}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  b: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#2b2117', borderWidth: 1, borderColor: cores.ouroEscuro },
  ativo: { backgroundColor: cores.ouro, borderColor: cores.ouro },
  grande: { backgroundColor: cores.ouro, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 10, borderColor: '#fff3' },
  t: { color: cores.texto, fontWeight: '700', fontSize: 13 },
  tg: { color: cores.fundo, fontSize: 22, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
});
