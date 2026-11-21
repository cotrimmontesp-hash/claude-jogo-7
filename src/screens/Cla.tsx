// Tela do Clã: guerreiros, construções, invadir fortes e histórico de batalhas.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useJogo } from '../state/store';
import { GUERREIROS, CONSTRUCOES, FORTES, guerreirosMax } from '../data/cla';
import { recrutar, construir, curarFeridos, poderDefesa, poderAtaque, invadirAutomatico, invadirNoMapa, poderGuerreiro } from '../game/claLogica';
import type { Material } from '../data/items';
import { cores, Botao } from '../ui/tema';

const ABAS = ['Guerreiros', 'Construções', 'Invadir', 'Histórico'] as const;
const txt = (c: Partial<Record<Material, number>>) => Object.entries(c).map(([k, v]) => `${v} ${k.replace('_', ' ')}`).join(' · ');

export function Cla() {
  const { progresso: p, irPara } = useJogo();
  const [aba, setAba] = useState<(typeof ABAS)[number]>('Guerreiros');
  const [aviso, setAviso] = useState('');
  const [levados, setLevados] = useState<string[]>([]);
  if (!p) return <View style={s.tela}><Text style={s.texto}>Comece um jogo para ter um clã.</Text><Botao texto="◂ Voltar" onPress={() => irPara('menu')} /></View>;
  const c = p.cla;
  const avisar = (e: string | null, ok: string) => { setAviso(e ?? ok); setTimeout(() => setAviso(''), 2500); };
  const disponiveis = c.guerreiros.filter((g) => !g.ferido);

  return (
    <View style={s.tela}>
      <View style={s.linha}>
        <Text style={s.grande}>⚑ {c.nome}</Text>
        {ABAS.map((a) => <Botao key={a} texto={a} ativo={aba === a} onPress={() => setAba(a)} />)}
        <Botao texto="◂ Voltar" onPress={() => irPara('jogo')} />
      </View>
      <Text style={s.texto}>Guerreiros {c.guerreiros.length}/{guerreirosMax(c.construcoes.quartel ?? 0)} · Defesa do clã {Math.round(poderDefesa(c))} · Fortes tomados {c.fortesConquistados.length}/{FORTES.length}</Text>
      {c.invasaoAtiva && <Text style={s.alerta}>⚠ O clã está sendo invadido! Volte ao jogo para defender.</Text>}
      {!!aviso && <Text style={s.aviso}>{aviso}</Text>}

      <ScrollView contentContainerStyle={s.grade}>
        {aba === 'Guerreiros' && <>
          {c.guerreiros.map((g) => (
            <View key={g.id} style={s.card}>
              <Text style={s.nome}>{g.nome} {g.ferido ? '🩹' : ''}</Text>
              <Text style={s.texto}>{GUERREIROS.find((t) => t.classe === g.classe)!.nome} · Nv {g.nivel} · Poder {Math.round(poderGuerreiro(g))}</Text>
            </View>
          ))}
          {c.guerreiros.some((g) => g.ferido) && <Botao texto="🩹 Tratar feridos (descansar no clã)" onPress={curarFeridos} />}
          <Text style={[s.nome, { width: '100%' }]}>Recrutar</Text>
          {GUERREIROS.map((t) => (
            <Pressable key={t.classe} style={s.card} onPress={() => avisar(recrutar(t.classe), `${t.nome} entrou para o clã!`)}>
              <Text style={s.nome}>+ {t.nome}</Text>
              <Text style={s.texto}>Vida {t.vida} · Dano {t.dano} · Defesa {t.defesa}</Text>
              <Text style={s.desc}>{txt(t.custo)} · {t.desbloqueio}</Text>
            </Pressable>
          ))}
        </>}

        {aba === 'Construções' && CONSTRUCOES.map((k) => {
          const n = c.construcoes[k.id] ?? 0;
          return (
            <Pressable key={k.id} style={s.card} onPress={() => avisar(construir(k.id), `${k.nome} evoluiu!`)}>
              <Text style={s.nome}>{k.nome} · Nv {n}/{k.nivelMax}</Text>
              <Text style={s.texto}>{k.efeito}</Text>
              <Text style={s.desc}>{n < k.nivelMax ? `⚒ ${txt(k.custo(n))}` : 'Máximo'}</Text>
            </Pressable>
          );
        })}

        {aba === 'Invadir' && <>
          <Text style={[s.texto, { width: '100%' }]}>Escolha quem vai com você ({levados.length} selecionados · poder {Math.round(poderAtaque(c, levados))}):</Text>
          {disponiveis.map((g) => (
            <Botao key={g.id} texto={`${g.nome} (Nv ${g.nivel})`} ativo={levados.includes(g.id)}
              onPress={() => setLevados(levados.includes(g.id) ? levados.filter((x) => x !== g.id) : [...levados, g.id])} />
          ))}
          <Botao texto="Todos" onPress={() => setLevados(disponiveis.map((g) => g.id))} />
          {FORTES.map((f) => {
            const liberado = p.capitulo >= f.capitulo; const tomado = c.fortesConquistados.includes(f.id);
            return (
              <View key={f.id} style={[s.card, !liberado && { opacity: 0.45 }]}>
                <Text style={s.nome}>{tomado ? '🏳 ' : '🏰 '}{f.nome}</Text>
                <Text style={s.texto}>{f.guardas} guardas · Poder {f.poder}</Text>
                <Text style={s.desc}>Saque: {txt(f.recompensa)}{tomado ? ' (reduzido)' : ''}</Text>
                {liberado ? (
                  <View style={s.linha}>
                    <Botao texto="⚔ Invadir junto" onPress={() => { if (!levados.length) return avisar('Escolha seus guerreiros', ''); invadirNoMapa(f.id, levados); irPara('jogo'); }} />
                    <Botao texto="Mandar só eles" onPress={() => { if (!levados.length) return avisar('Escolha seus guerreiros', ''); avisar(null, invadirAutomatico(f.id, levados) ? 'Vitória! Saque trazido.' : 'Derrota... os guerreiros recuaram.'); setLevados([]); }} />
                  </View>
                ) : <Text style={s.desc}>🔒 Libera no capítulo {f.capitulo}</Text>}
              </View>
            );
          })}
        </>}

        {aba === 'Histórico' && (c.historico.length ? c.historico.map((h, i) => (
          <View key={i} style={s.card}>
            <Text style={s.nome}>{h.venceu ? '✅' : '❌'} {h.tipo === 'defesa' ? 'Defesa contra' : 'Ataque a'} {h.alvo}</Text>
            <Text style={s.desc}>Perdas: {h.perdas} · {h.tipo === 'defesa' && !h.venceu ? `Saqueado: ${txt(h.saque)}` : txt(h.saque)}</Text>
          </View>
        )) : <Text style={s.desc}>Nenhuma batalha ainda.</Text>)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, gap: 8 },
  grande: { color: cores.ouro, fontSize: 22, fontWeight: '900', marginRight: 10 },
  linha: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 30 },
  card: { width: 240, backgroundColor: cores.painel, borderRadius: 12, padding: 10, gap: 4, borderWidth: 1, borderColor: cores.ouroEscuro },
  nome: { color: cores.texto, fontWeight: '900' }, texto: { color: cores.texto, fontSize: 12 }, desc: { color: cores.textoFraco, fontSize: 11 },
  alerta: { color: '#fff', backgroundColor: cores.vermelho, padding: 8, borderRadius: 8, fontWeight: '800' },
  aviso: { color: cores.ouro, fontWeight: '800' },
});
