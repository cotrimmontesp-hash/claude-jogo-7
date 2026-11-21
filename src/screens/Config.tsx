import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useJogo, type ModoCamera, type Qualidade } from '../state/store';
import { cores, Botao } from '../ui/tema';

const CAMERAS: { id: ModoCamera; nome: string; desc: string }[] = [
  { id: 'terceira', nome: 'Terceira pessoa', desc: 'Câmera atrás do herói, mundo aberto' },
  { id: 'cima', nome: 'Vista de cima', desc: 'Câmera do alto' },
  { id: 'lateral', nome: 'Lateral 2.5D', desc: 'Andar para os lados, estilo plataforma' },
];
const QUALIDADES: { id: Qualidade; nome: string }[] = [
  { id: 'baixo', nome: 'Baixo' }, { id: 'medio', nome: 'Médio' }, { id: 'alto', nome: 'Alto' }, { id: 'ultra', nome: 'Ultra (PC)' },
];

export function Config() {
  const { config, setConfig, irPara } = useJogo();
  const Linha = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <View style={s.bloco}><Text style={s.titulo}>{titulo}</Text><View style={s.linha}>{children}</View></View>
  );
  const passo = (v: number, d: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v + d)) * 10) / 10;

  return (
    <ScrollView style={{ backgroundColor: cores.fundo }} contentContainerStyle={s.tela}>
      <Text style={s.grande}>CONFIGURAÇÕES</Text>
      <Linha titulo="Câmera / jeito de jogar">
        {CAMERAS.map((c) => <Botao key={c.id} texto={c.nome} ativo={config.camera === c.id} onPress={() => setConfig({ camera: c.id })} />)}
      </Linha>
      <Text style={s.desc}>{CAMERAS.find((c) => c.id === config.camera)?.desc}</Text>
      <Linha titulo="Qualidade gráfica">
        {QUALIDADES.map((q) => <Botao key={q.id} texto={q.nome} ativo={config.qualidade === q.id} onPress={() => setConfig({ qualidade: q.id })} />)}
      </Linha>
      <Linha titulo={`Sensibilidade da câmera: ${config.sensibilidade}`}>
        <Botao texto="−" onPress={() => setConfig({ sensibilidade: passo(config.sensibilidade, -0.1, 0.2, 3) })} />
        <Botao texto="+" onPress={() => setConfig({ sensibilidade: passo(config.sensibilidade, 0.1, 0.2, 3) })} />
      </Linha>
      <Linha titulo={`Volume: ${Math.round(config.volume * 100)}%`}>
        <Botao texto="−" onPress={() => setConfig({ volume: passo(config.volume, -0.1, 0, 1) })} />
        <Botao texto="+" onPress={() => setConfig({ volume: passo(config.volume, 0.1, 0, 1) })} />
      </Linha>
      <Linha titulo="Chamada de voz no grupo">
        <Botao texto="Ligada" ativo={config.vozAtiva} onPress={() => setConfig({ vozAtiva: true })} />
        <Botao texto="Desligada" ativo={!config.vozAtiva} onPress={() => setConfig({ vozAtiva: false })} />
      </Linha>
      <Text style={s.desc}>PC: clique na tela para prender o mouse e girar a câmera · WASD anda · Shift corre · Espaço pula · Ctrl/C ou botão direito furtivo · E montar/interagir · Q visão de águia · Clique ataca · Rodinha zoom · Esc solta o mouse</Text>
      <Botao texto="◂ Voltar" onPress={() => irPara('menu')} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 12 },
  grande: { color: cores.ouro, fontSize: 26, fontWeight: '900' },
  bloco: { gap: 6 }, titulo: { color: cores.texto, fontWeight: '800' },
  linha: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  desc: { color: cores.textoFraco, fontSize: 12 },
});
