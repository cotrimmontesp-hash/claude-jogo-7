import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useJogo } from '../state/store';
import { CAPITULOS } from '../data/story';
import { MONTARIAS } from '../data/mounts';
import { cores } from './tema';
import { Platform } from 'react-native';
import { entrada } from '../game/input';
import { defenderNoMapa, defenderAutomatico, useBatalha } from '../game/claLogica';
import { entrarNaCall, sairDaCall, alternarMudo } from '../net/voz';

const Barra = ({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) => (
  <View style={s.barraLinha}>
    <Text style={s.rotulo}>{rotulo}</Text>
    <View style={s.barra}><View style={[s.cheia, { width: `${valor}%`, backgroundColor: cor }]} /></View>
  </View>
);

function BotaoVoz() {
  const vozAtiva = useJogo((s) => s.config.vozAtiva);
  const [naCall, setNaCall] = React.useState(false);
  const [mudo, setMudo] = React.useState(false);
  if (!vozAtiva) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      <Pressable onPress={async () => { if (naCall) { sairDaCall(); setNaCall(false); } else { await entrarNaCall(); setNaCall(true); } }}>
        <Text style={s.hora}>{naCall ? '📞 Sair da call' : '📞 Entrar na call'}</Text>
      </Pressable>
      {naCall && <Pressable onPress={() => setMudo(alternarMudo())}><Text style={s.hora}>{mudo ? '🔇' : '🎙'}</Text></Pressable>}
    </View>
  );
}

export function HUD({ onPausar }: { onPausar: () => void }) {
  const p = useJogo((s) => s.progresso);
  const irPara = useJogo((s) => s.irPara);
  const batalha = useBatalha((s) => s.ativa);
  const combatentes = useBatalha((s) => s.combatentes);
  if (!p) return null;
  const cap = CAPITULOS.find((c) => c.id === p.capitulo);
  const missao = cap?.missoes[p.missao - 1];
  const hora = `${String(Math.floor(p.horaDoDia)).padStart(2, '0')}:${String(Math.floor((p.horaDoDia % 1) * 60)).padStart(2, '0')}`;
  const mont = p.montado ? MONTARIAS.find((m) => m.id === p.montado) : null;
  const pc = Platform.OS === 'web' && typeof window !== 'undefined' && !('ontouchstart' in window);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={s.barras}>
        <Barra rotulo="❤" valor={p.vida} cor={cores.vermelho} />
        <Barra rotulo="🍖" valor={p.fome} cor="#c9822b" />
        <Barra rotulo="💧" valor={p.sede} cor={cores.azul} />
        <Barra rotulo="⚡" valor={p.energia} cor={cores.verde} />
      </View>
      {p.modo === 'sobrevivencia' && <View style={s.missao}><Text style={s.cap}>Dia {p.diasSobrevividos + 1}</Text></View>}
      {p.cla.invasaoAtiva && !batalha && (
        <View style={s.invasao}>
          <Text style={s.invTit}>⚠ O CONSELHO DE FERRO ESTÁ INVADINDO SEU CLÃ!</Text>
          <Text style={s.obj}>Força inimiga {p.cla.invasaoAtiva.poder}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={s.invBtn} onPress={defenderNoMapa}><Text style={s.invBtnTxt}>⚔ Defender com meus guerreiros</Text></Pressable>
            <Pressable style={s.invBtn} onPress={defenderAutomatico}><Text style={s.invBtnTxt}>Deixar eles defenderem</Text></Pressable>
          </View>
        </View>
      )}
      {batalha && (
        <View style={s.invasao}>
          <Text style={s.invTit}>{batalha.tipo === 'defesa' ? '🛡 DEFENDENDO O CLÃ' : '⚔ INVASÃO AO FORTE'}</Text>
          <Text style={s.obj}>Aliados {combatentes.filter((c) => c.lado === 'aliado' && c.vida > 0).length} · Inimigos {combatentes.filter((c) => c.lado === 'inimigo' && c.vida > 0).length}</Text>
        </View>
      )}
      {pc && !entrada.mouseTravado && (
        <View style={s.dica} pointerEvents="none">
          <Text style={s.dicaTxt}>🖱 Clique na tela para controlar a câmera com o mouse  •  W duas vezes: correr  •  E: usar  •  Rodinha: zoom  •  Esc: soltar o mouse</Text>
        </View>
      )}
      <View style={s.topoDir}>
        <Text style={s.hora}>{p.horaDoDia > 19 || p.horaDoDia < 6 ? '🌙' : '☀'} {hora}</Text>
        {mont && <Text style={s.hora}>🐎 {mont.nome}</Text>}
        {p.modo !== 'historia_solo' && <BotaoVoz />}
        <Pressable onPress={() => irPara('cla')}><Text style={s.hora}>⚑ Clã ({p.cla.guerreiros.length})</Text></Pressable>
        <Pressable onPress={onPausar} style={s.pausa}><Text style={s.hora}>⏸</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  barras: { position: 'absolute', top: 12, left: 12, gap: 4 },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rotulo: { width: 20, fontSize: 13 },
  barra: { width: 150, height: 9, backgroundColor: '#0008', borderRadius: 5, overflow: 'hidden' },
  cheia: { height: 9 },
  missao: { position: 'absolute', top: 12, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  cap: { color: cores.ouro, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 },
  obj: { color: cores.texto, fontSize: 12, textShadowColor: '#000', textShadowRadius: 4 },
  topoDir: { position: 'absolute', top: 12, right: 12, alignItems: 'flex-end', gap: 4 },
  hora: { color: cores.texto, fontWeight: '800', backgroundColor: '#0008', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pausa: { marginTop: 4 },
  dica: { position: 'absolute', bottom: 18, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  dicaTxt: { color: cores.texto, backgroundColor: '#000a', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, fontSize: 13 },
  invasao: { position: 'absolute', top: 60, alignSelf: 'center', left: 0, right: 0, alignItems: 'center', gap: 4 },
  invTit: { color: '#fff', backgroundColor: '#b8342acc', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, fontWeight: '900' },
  invBtn: { backgroundColor: '#000b', borderWidth: 1, borderColor: cores.ouro, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  invBtnTxt: { color: cores.ouro, fontWeight: '800', fontSize: 12 },
});
