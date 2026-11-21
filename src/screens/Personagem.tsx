import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useJogo, progressoInicial } from '../state/store';
import { HEROIS } from '../data/characters';
import { listarSaves, salvar, SLOTS } from '../state/save';
import { cores, Botao } from '../ui/tema';

export function Personagem() {
  const { irPara, setProgresso, setSlot, modoEscolhido } = useJogo();
  const [heroi, setHeroi] = useState<'ines' | 'tome'>('ines');
  const [saves, setSaves] = useState<any[]>([]);
  const [slot, setSl] = useState(0);
  useEffect(() => { listarSaves().then((sv) => { setSaves(sv); const livre = sv.findIndex((x) => !x); setSl(livre >= 0 ? livre : 0); }); }, []);

  const comecar = async () => {
    const p = progressoInicial(heroi, modoEscolhido);
    setSlot(slot); setProgresso(p); await salvar(slot, p); irPara('jogo');
  };

  return (
    <View style={s.tela}>
      <Text style={s.titulo}>ESCOLHA SEU HERÓI</Text>
      <View style={s.linha}>
        {HEROIS.map((h) => (
          <Pressable key={h.id} onPress={() => setHeroi(h.id)} style={[s.card, heroi === h.id && s.ativo]}>
            <Text style={{ fontSize: 50 }}>{h.id === 'ines' ? '🗡️' : '🪓'}</Text>
            <Text style={s.nome}>{h.nome}</Text>
            <Text style={s.desc}>{h.historia}</Text>
            <Text style={s.desc}>Furtividade {Math.round(h.bonus.furtividade * 100)} · Força {Math.round(h.bonus.forca * 100)} · Agilidade {Math.round(h.bonus.agilidade * 100)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.desc}>Espaço de salvamento:</Text>
      <View style={s.linha}>
        {Array.from({ length: SLOTS }).map((_, i) => (
          <Botao key={i} ativo={slot === i} texto={saves[i] ? `${i + 1}: Cap. ${saves[i].capitulo} (substituir)` : `${i + 1}: Vazio`} onPress={() => setSl(i)} />
        ))}
      </View>
      <View style={s.linha}>
        <Botao texto="◂ Voltar" onPress={() => irPara('menu')} />
        <Botao grande texto="COMEÇAR" onPress={comecar} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: 20, gap: 14, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: cores.ouro, fontSize: 26, fontWeight: '900' },
  linha: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  card: { width: 260, backgroundColor: cores.painel, borderRadius: 14, padding: 16, gap: 6, borderWidth: 2, borderColor: 'transparent', alignItems: 'center' },
  ativo: { borderColor: cores.ouro },
  nome: { color: cores.texto, fontSize: 22, fontWeight: '900' },
  desc: { color: cores.textoFraco, fontSize: 12, textAlign: 'center' },
});
