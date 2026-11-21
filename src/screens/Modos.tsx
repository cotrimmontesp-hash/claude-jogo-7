import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useJogo } from '../state/store';
import { MODOS } from '../data/modes';
import { cores, Botao } from '../ui/tema';

const ICONE = { historia_solo: '📖', historia_coop: '👥', sobrevivencia: '🔥', cacadas: '🐆' } as const;

export function Modos() {
  const { modoEscolhido, setModo, irPara } = useJogo();
  return (
    <View style={s.tela}>
      <Text style={s.titulo}>ESCOLHA O MODO</Text>
      <View style={s.grade}>
        {MODOS.map((m) => (
          <Pressable key={m.id} onPress={() => { setModo(m.id); irPara('menu'); }} style={[s.card, modoEscolhido === m.id && s.ativo]}>
            <Text style={{ fontSize: 40 }}>{ICONE[m.id]}</Text>
            <Text style={s.nome}>{m.nome}</Text>
            <Text style={s.desc}>{m.descricao}</Text>
            <Text style={s.tag}>{m.maxJogadores > 1 ? `1 a ${m.maxJogadores} jogadores · online` : 'Solo · offline'}</Text>
          </Pressable>
        ))}
      </View>
      <Botao texto="◂ Voltar" onPress={() => irPara('menu')} />
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: 20, gap: 14, alignItems: 'center' },
  titulo: { color: cores.ouro, fontSize: 26, fontWeight: '900' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  card: { width: 200, minHeight: 210, backgroundColor: cores.painel, borderRadius: 14, padding: 14, gap: 6, borderWidth: 2, borderColor: 'transparent' },
  ativo: { borderColor: cores.ouro },
  nome: { color: cores.texto, fontSize: 17, fontWeight: '900' },
  desc: { color: cores.textoFraco, fontSize: 12, flex: 1 },
  tag: { color: cores.ouro, fontSize: 11, fontWeight: '700' },
});
