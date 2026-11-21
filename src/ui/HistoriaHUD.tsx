// Interface do modo história: objetivo com seta e distância, diálogos, vida do chefe, menu da canoa e avisos.
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useJogo } from '../state/store';
import { HISTORIA, missaoAtual, useHistoria } from '../game/historia';
import { useViagem } from '../game/teleporte';
import { jogadorPos, cameraInfo } from '../game/Mundo';
import { ILHAS, ilhaDe } from '../game/mapa';
import { cores } from './tema';

export function HistoriaHUD() {
  const p = useJogo((s) => s.progresso);
  const { dialogo, indiceFala, contagem, chefe, aviso, avancar } = useHistoria();
  const viagem = useViagem();

  // teclado: Enter/Espaço/E avançam a conversa
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const k = (e: KeyboardEvent) => { if (useHistoria.getState().dialogo && ['Enter', ' ', 'e', 'E'].includes(e.key)) { e.preventDefault(); useHistoria.getState().avancar(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  if (!p) return null;
  const historia = p.modo.startsWith('historia');
  const m = historia ? missaoAtual() : null;
  const cap = HISTORIA[p.capitulo - 1];
  let seta = 0, dist = 0, dica = '';
  if (m) {
    // objetivo em outra ilha: a seta aponta para o cais da ilha onde você está
    const aqui = ilhaDe(jogadorPos.x, jogadorPos.z), la = ilhaDe(m.local[0], m.local[1]);
    let alvo = m.local;
    if (aqui && la && aqui.id !== la.id) { alvo = aqui.cais; dica = `🛶 Vá até o cais e reme para: ${la.nome}`; }
    const dx = alvo[0] - jogadorPos.x, dz = alvo[1] - jogadorPos.z;
    dist = Math.hypot(dx, dz);
    seta = -(Math.atan2(dx, dz) - cameraInfo.yaw) * (180 / Math.PI);
  }
  const fala = dialogo?.[indiceFala];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* objetivo atual */}
      {historia && (
        <View style={s.missao} pointerEvents="none">
          {m ? <>
            <Text style={s.cap}>Cap. {p.capitulo} · {cap?.titulo}  —  Missão {p.missao}/{cap?.missoes.length}</Text>
            <Text style={s.titulo}>◆ {m.titulo}</Text>
            <Text style={s.obj}>{m.objetivo}{(m.tipo === 'coletar' || m.tipo === 'cacar') && m.quantidade ? `  (${Math.max(0, contagem)}/${m.quantidade})` : ''}</Text>
            {!!dica && <Text style={[s.obj, { color: '#9ad0ff' }]}>{dica}</Text>}
            <View style={s.bussola}>
              <Text style={[s.seta, { transform: [{ rotate: `${seta}deg` }] }]}>⬆</Text>
              <Text style={s.dist}>{dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`}</Text>
            </View>
          </> : <Text style={s.titulo}>🏆 História concluída! Defenda seu clã e conquiste as ilhas rivais.</Text>}
        </View>
      )}

      {/* vida do chefe */}
      {chefe && chefe.vida > 0 && (
        <View style={s.chefe} pointerEvents="none">
          <Text style={s.chefeNome}>☠ {chefe.def.nome}</Text>
          <View style={s.barra}><View style={[s.barraVida, { width: `${(chefe.vida / chefe.def.vida) * 100}%` }]} /></View>
        </View>
      )}

      {/* aviso de missão concluída */}
      {!!aviso && <View style={s.aviso} pointerEvents="none"><Text style={s.avisoTxt}>{aviso}</Text></View>}

      {/* diálogo */}
      {fala && (
        <Pressable style={s.dialogo} onPress={avancar}>
          <Text style={s.quem}>{fala.quem}</Text>
          <Text style={s.fala}>{fala.texto}</Text>
          <Text style={s.continuar}>{indiceFala + 1 < (dialogo?.length ?? 0) ? 'toque para continuar ▶' : 'toque para fechar ✕'}</Text>
        </Pressable>
      )}

      {/* canoa: escolher ilha */}
      {viagem.aberto && (
        <View style={s.menuViagem}>
          <Text style={s.menuTitulo}>🛶 Para onde remar?</Text>
          {ILHAS.filter((i) => i.id !== viagem.origem).map((i) => (
            <Pressable key={i.id} style={[s.opcao, { borderColor: i.cor ?? cores.ouro }]} onPress={() => viagem.viajar(i.id)}>
              <Text style={s.opcaoTxt}>{i.dono === 'jogador' ? '🏠' : i.dono === 'principal' ? '⛪' : '⚔'} {i.nome}</Text>
            </Pressable>
          ))}
          <Pressable style={s.opcao} onPress={viagem.fechar}><Text style={s.opcaoTxt}>Ficar aqui</Text></Pressable>
        </View>
      )}
      {!!viagem.viajando && <View style={s.viajando} pointerEvents="none"><Text style={s.viajandoTxt}>🛶 Remando até {viagem.viajando}...</Text></View>}
    </View>
  );
}

const s = StyleSheet.create({
  missao: { position: 'absolute', top: 10, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  cap: { color: cores.textoFraco, fontSize: 11, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  titulo: { color: cores.ouro, fontSize: 16, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 },
  obj: { color: cores.texto, fontSize: 13, textShadowColor: '#000', textShadowRadius: 4, maxWidth: 520, textAlign: 'center' },
  bussola: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, backgroundColor: '#0008', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  seta: { color: cores.ouro, fontSize: 20, fontWeight: '900' },
  dist: { color: cores.texto, fontWeight: '800', fontSize: 13 },
  chefe: { position: 'absolute', top: 96, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  chefeNome: { color: '#ffb3a8', fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 },
  barra: { width: 360, height: 12, backgroundColor: '#000b', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#ffb3a855' },
  barraVida: { height: 12, backgroundColor: '#c0392b' },
  aviso: { position: 'absolute', top: 130, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  avisoTxt: { color: '#fff', backgroundColor: '#2e7d32dd', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, fontWeight: '800', maxWidth: 600, textAlign: 'center' },
  dialogo: { position: 'absolute', bottom: 24, left: '18%', right: '18%', backgroundColor: '#120d08ee', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: cores.ouro, zIndex: 50 },
  quem: { color: cores.ouro, fontWeight: '900', fontSize: 15, marginBottom: 4 },
  fala: { color: cores.texto, fontSize: 15, lineHeight: 21 },
  continuar: { color: cores.textoFraco, fontSize: 11, textAlign: 'right', marginTop: 6 },
  menuViagem: { position: 'absolute', alignSelf: 'center', top: '20%', left: '28%', right: '28%', backgroundColor: '#120d08f2', borderRadius: 14, padding: 14, gap: 8, borderWidth: 2, borderColor: cores.ouro, zIndex: 60 },
  menuTitulo: { color: cores.ouro, fontWeight: '900', fontSize: 18, textAlign: 'center' },
  opcao: { backgroundColor: '#2b2117', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: cores.ouroEscuro },
  opcaoTxt: { color: cores.texto, fontWeight: '800' },
  viajando: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a1420e0', alignItems: 'center', justifyContent: 'center', zIndex: 70 },
  viajandoTxt: { color: cores.texto, fontSize: 22, fontWeight: '900' },
});
