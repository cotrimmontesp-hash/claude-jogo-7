// Se uma tela quebrar, mostra o erro em vez de tela preta.
import React from 'react';
import { ScrollView, Text, Pressable } from 'react-native';

export class Protecao extends React.Component<{ children: React.ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };
  static getDerivedStateFromError(erro: Error) { return { erro }; }
  componentDidMount() { if (typeof document !== 'undefined') document.getElementById('carregando')?.remove(); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#120d08' }} contentContainerStyle={{ padding: 20, gap: 10 }}>
        <Text style={{ color: '#e8b64a', fontSize: 18, fontWeight: '900' }}>⚠ Algo deu errado — tire um print e mande para o Claude</Text>
        <Text style={{ color: '#f3eadb', fontFamily: 'monospace' }}>{String(this.state.erro?.stack ?? this.state.erro)}</Text>
        <Pressable onPress={() => this.setState({ erro: null })}><Text style={{ color: '#e8b64a' }}>Tentar de novo</Text></Pressable>
      </ScrollView>
    );
  }
}
