import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useOnline, adicionarAmigo, aceitarAmigo, recusarAmigo, removerAmigo, convidar } from '../net/client';
import { cores, Botao } from '../ui/tema';

export function Amigos() {
  const { amigos, pedidos, eu, sala } = useOnline();
  const [alvo, setAlvo] = useState('');
  const ordenados = [...amigos].sort((a, b) => Number(b.online) - Number(a.online));

  return (
    <ScrollView contentContainerStyle={{ gap: 8 }}>
      <Text style={s.texto}>Seu código: <Text style={s.codigo}>#{eu?.codigo ?? '-----'}</Text></Text>
      <TextInput style={s.input} value={alvo} onChangeText={setAlvo} placeholder="Código ou nome do amigo" placeholderTextColor="#887" />
      <Botao texto="+ Adicionar amigo" onPress={() => { if (alvo) { adicionarAmigo(alvo); setAlvo(''); } }} />

      {pedidos.length > 0 && <Text style={s.titulo}>Pedidos de amizade</Text>}
      {pedidos.map((p) => (
        <View key={p.id} style={s.item}>
          <Text style={s.texto}>{p.nome} #{p.codigo}</Text>
          <View style={s.linha}>
            <Botao texto="Aceitar" onPress={() => aceitarAmigo(p.id)} />
            <Botao texto="Recusar" onPress={() => recusarAmigo(p.id)} />
          </View>
        </View>
      ))}

      <Text style={s.titulo}>Amigos ({amigos.filter((a) => a.online).length} online)</Text>
      {ordenados.map((a) => (
        <View key={a.id} style={s.item}>
          <Text style={s.texto}>{a.online ? '🟢' : '⚫'} {a.nome} {a.emSala ? '· em partida' : ''}</Text>
          <View style={s.linha}>
            {a.online && sala && <Botao texto="Convidar" onPress={() => convidar(a.id)} />}
            <Botao texto="Remover" onPress={() => removerAmigo(a.id)} />
          </View>
        </View>
      ))}
      {amigos.length === 0 && <Text style={s.fraco}>Passe seu código para os amigos te adicionarem.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  texto: { color: cores.texto }, fraco: { color: cores.textoFraco, fontSize: 12 },
  codigo: { color: cores.ouro, fontWeight: '900' }, titulo: { color: cores.ouro, fontWeight: '800', marginTop: 6 },
  item: { backgroundColor: '#0006', padding: 8, borderRadius: 8, gap: 6 },
  linha: { flexDirection: 'row', gap: 6 },
  input: { borderWidth: 1, borderColor: cores.ouro, color: cores.texto, borderRadius: 8, padding: 8 },
});
