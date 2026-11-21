// Arsenal + Forja: equipar e evoluir armas/armaduras com materiais de animais, montarias e skins.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useJogo } from '../state/store';
import { ARMAS, ARMADURAS, custoEvolucao, valorComNivel, NIVEL_MAX, type Material, type Raridade } from '../data/items';
import { MONTARIAS, EQUIP_MONTARIA } from '../data/mounts';
import { SKINS } from '../data/skins';
import { cores, Botao } from '../ui/tema';

const COR_RAR: Record<Raridade, string> = { comum: '#9e9e9e', incomum: '#4caf50', raro: '#3a8ad6', epico: '#9c4dd6', lendario: '#e8b64a' };
const NOME_MAT: Record<Material, string> = { couro: 'Couro', couro_grosso: 'Couro grosso', osso: 'Osso', presa: 'Presa', pena: 'Pena', garra: 'Garra',
  escama: 'Escama', chifre: 'Chifre', pele_onca: 'Pele de onça', ferro: 'Ferro', ouro: 'Ouro', madeira: 'Madeira' };
const ABAS = ['Armas', 'Armaduras', 'Montarias', 'Skins'] as const;

export function Forja() {
  const { progresso: p, atualizar, irPara } = useJogo();
  const [aba, setAba] = useState<(typeof ABAS)[number]>('Armas');
  if (!p) return (
    <View style={s.vazio}><Text style={s.texto}>Comece ou continue um jogo para usar a forja.</Text><Botao texto="◂ Voltar" onPress={() => irPara('menu')} /></View>
  );

  const temMateriais = (c: Partial<Record<Material, number>>) => Object.entries(c).every(([m, q]) => (p.materiais[m as Material] ?? 0) >= (q ?? 0));
  const gastar = (c: Partial<Record<Material, number>>) => {
    const m = { ...p.materiais }; for (const [k, q] of Object.entries(c)) m[k as Material] = (m[k as Material] ?? 0) - (q ?? 0); return m;
  };
  const evoluir = (lista: 'armas' | 'armaduras', id: string, rar: Raridade) => {
    const item = p[lista].find((i) => i.id === id)!; const custo = custoEvolucao(rar, item.nivel);
    if (item.nivel >= NIVEL_MAX || !temMateriais(custo)) return;
    atualizar((q) => ({ materiais: gastar(custo), [lista]: q[lista].map((i) => (i.id === id ? { ...i, nivel: i.nivel + 1 } : i)) }));
  };
  const custoTxt = (c: Partial<Record<Material, number>>) => Object.entries(c).map(([m, q]) => `${q} ${NOME_MAT[m as Material]}`).join(' · ');

  return (
    <View style={s.tela}>
      <View style={s.linha}>
        <Text style={s.grande}>ARSENAL & FORJA</Text>
        {ABAS.map((a) => <Botao key={a} texto={a} ativo={aba === a} onPress={() => setAba(a)} />)}
        <Botao texto="◂ Voltar" onPress={() => irPara(p ? 'jogo' : 'menu')} />
      </View>
      <Text style={s.mat}>Materiais: {Object.entries(p.materiais).filter(([, q]) => q).map(([m, q]) => `${NOME_MAT[m as Material]} ${q}`).join(' · ') || 'nenhum — cace animais!'}</Text>

      <ScrollView contentContainerStyle={s.grade}>
        {aba === 'Armas' && ARMAS.map((a) => {
          const meu = p.armas.find((i) => i.id === a.id);
          const custo = meu ? custoEvolucao(a.raridade, meu.nivel) : {};
          return (
            <View key={a.id} style={[s.card, { borderColor: COR_RAR[a.raridade] }, !meu && s.bloq]}>
              <Text style={[s.nome, { color: COR_RAR[a.raridade] }]}>{a.nome}{meu?.nivel ? ` +${meu.nivel}` : ''}</Text>
              <Text style={s.texto}>{a.tipo} · Dano {valorComNivel(a.dano, meu?.nivel ?? 0)} · Vel {a.velocidade}</Text>
              {meu ? <>
                <Botao texto={p.equipado.arma === a.id ? 'Equipada ✔' : 'Equipar'} ativo={p.equipado.arma === a.id} onPress={() => atualizar((q) => ({ equipado: { ...q.equipado, arma: a.id } }))} />
                {meu.nivel < NIVEL_MAX && <Pressable onPress={() => evoluir('armas', a.id, a.raridade)}><Text style={[s.evo, !temMateriais(custo) && s.sem]}>⚒ Evoluir: {custoTxt(custo)}</Text></Pressable>}
              </> : <Text style={s.desc}>🔒 Encontre na história ou em baús</Text>}
            </View>
          );
        })}

        {aba === 'Armaduras' && ARMADURAS.map((a) => {
          const meu = p.armaduras.find((i) => i.id === a.id);
          const custo = meu ? custoEvolucao(a.raridade, meu.nivel) : {};
          return (
            <View key={a.id} style={[s.card, { borderColor: COR_RAR[a.raridade] }, !meu && s.bloq]}>
              <Text style={[s.nome, { color: COR_RAR[a.raridade] }]}>{a.nome}{meu?.nivel ? ` +${meu.nivel}` : ''}</Text>
              <Text style={s.texto}>{a.slot} · Defesa {valorComNivel(a.defesa, meu?.nivel ?? 0)} · Furtividade {a.furtividade >= 0 ? '+' : ''}{a.furtividade}</Text>
              {meu ? <>
                <Botao texto={p.equipado[a.slot] === a.id ? 'Equipada ✔' : 'Equipar'} ativo={p.equipado[a.slot] === a.id} onPress={() => atualizar((q) => ({ equipado: { ...q.equipado, [a.slot]: a.id } }))} />
                {meu.nivel < NIVEL_MAX && <Pressable onPress={() => evoluir('armaduras', a.id, a.raridade)}><Text style={[s.evo, !temMateriais(custo) && s.sem]}>⚒ Evoluir: {custoTxt(custo)}</Text></Pressable>}
              </> : <Text style={s.desc}>🔒 Forje com materiais ou ganhe na história</Text>}
            </View>
          );
        })}

        {aba === 'Montarias' && <>
          {MONTARIAS.map((m) => {
            const tem = p.montarias.includes(m.id);
            return (
              <View key={m.id} style={[s.card, !tem && s.bloq]}>
                <Text style={s.nome}>{m.nome}</Text>
                <Text style={s.texto}>Vel {m.velocidade} · Fôlego {m.folego}s · Carga {m.carga} · Leva {m.passageiros}</Text>
                <Text style={s.desc}>{tem ? '✔ Sua' : `🔒 ${m.comoConseguir}`}</Text>
              </View>
            );
          })}
          {EQUIP_MONTARIA.map((e) => {
            const tem = p.equipMontaria.includes(e.id);
            return (
              <View key={e.id} style={s.card}>
                <Text style={s.nome}>{e.nome}</Text><Text style={s.texto}>{e.efeito}</Text>
                {tem ? <Text style={s.desc}>✔ Instalado</Text> :
                  <Pressable onPress={() => temMateriais(e.custo) && atualizar((q) => ({ materiais: gastar(e.custo), equipMontaria: [...q.equipMontaria, e.id] }))}>
                    <Text style={[s.evo, !temMateriais(e.custo) && s.sem]}>⚒ Criar: {custoTxt(e.custo)}</Text>
                  </Pressable>}
              </View>
            );
          })}
        </>}

        {aba === 'Skins' && SKINS.filter((k) => k.para === p.heroi || k.para === 'ambos' || k.para === 'montaria' || k.para === 'arma').map((k) => {
          const tem = p.skins.includes(k.id);
          const campo = k.para === 'montaria' ? 'skinMontaria' : k.para === 'arma' ? 'skinArma' : 'skinAtual';
          const usando = (p as any)[campo] === k.id;
          return (
            <View key={k.id} style={[s.card, { borderColor: COR_RAR[k.raridade] }, !tem && s.bloq]}>
              <Text style={[s.nome, { color: COR_RAR[k.raridade] }]}>{k.nome}</Text>
              <Text style={s.desc}>{k.para === 'montaria' ? 'Montaria' : k.para === 'arma' ? 'Arma' : 'Herói'} · {tem ? '' : `🔒 ${k.comoGanhar}`}</Text>
              {tem && <Botao texto={usando ? 'Usando ✔' : 'Usar'} ativo={usando} onPress={() => atualizar(() => ({ [campo]: k.id }))} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, gap: 8 },
  vazio: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center', gap: 12 },
  grande: { color: cores.ouro, fontSize: 22, fontWeight: '900', marginRight: 10 },
  linha: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  mat: { color: cores.texto, fontSize: 12 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 30 },
  card: { width: 230, backgroundColor: cores.painel, borderRadius: 12, padding: 10, gap: 5, borderWidth: 2, borderColor: cores.ouroEscuro },
  bloq: { opacity: 0.5 },
  nome: { color: cores.texto, fontWeight: '900' }, texto: { color: cores.texto, fontSize: 12 }, desc: { color: cores.textoFraco, fontSize: 11 },
  evo: { color: cores.ouro, fontSize: 11, fontWeight: '700' }, sem: { color: cores.textoFraco },
});
