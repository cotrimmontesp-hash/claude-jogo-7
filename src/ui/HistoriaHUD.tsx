// Interface do modo história: objetivo com seta e distância, diálogos, vida do chefe, menu da canoa e avisos.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useJogo } from '../state/store';
import { HISTORIA, missaoAtual, useHistoria } from '../game/historia';
import { useViagem } from '../game/teleporte';
import { useInterior, COMERCIANTE, comprar, type Oferta } from '../game/Interiores';
import { jogadorPos, cameraInfo } from '../game/Mundo';
import { ILHAS, ilhaDe } from '../game/mapa';
import { cores } from './tema';

export function HistoriaHUD() {
  const p = useJogo((s) => s.progresso);
  const { dialogo, indiceFala, contagem, chefe, aviso, avancar } = useHistoria();
  const viagem = useViagem();
  const dicaCasa = useInterior((s) => s.dica);
  const [, tique] = useState(0);
  useEffect(() => { const t = setInterval(() => tique((n) => n + 1), 300); return () => clearInterval(t); }, []);

  // teclado: Enter/Espaço/E avançam a conversa
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const k = (e: KeyboardEvent) => { if (useHistoria.getState().dialogo && ['Enter', ' ', 'e', 'E'].includes(e.key)) { e.preventDefault(); useHistoria.getState().avancar(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  // a conversa passa sozinha (no PC o mouse fica preso no jogo e não dá para clicar na caixa)
  useEffect(() => {
    const f = dialogo?.[indiceFala]; if (!f) return;
    const t = setTimeout(() => useHistoria.getState().avancar(), Math.max(3500, f.texto.length * 65));
    return () => clearTimeout(t);
  }, [dialogo, indiceFala]);

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

      <MiniMapa alvo={m?.local} />

      {/* vida do chefe */}
      {chefe && chefe.vida > 0 && (
        <View style={s.chefe} pointerEvents="none">
          <Text style={s.chefeNome}>☠ {chefe.def.nome}</Text>
          <View style={s.barra}><View style={[s.barraVida, { width: `${(chefe.vida / chefe.def.vida) * 100}%` }]} /></View>
        </View>
      )}

      {/* aviso de missão concluída */}
      {!!aviso && <View style={s.aviso} pointerEvents="none"><Text style={s.avisoTxt}>{aviso}</Text></View>}

      {!!dicaCasa && !fala && <View style={s.dicaCasa} pointerEvents="none"><Text style={s.dicaTxt}>{dicaCasa}</Text></View>}

      <Loja />

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
  cap: { color: cores.textoFraco, fontSize: 9, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  titulo: { color: cores.ouro, fontSize: 13, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 },
  obj: { color: cores.texto, fontSize: 11, textShadowColor: '#000', textShadowRadius: 4, maxWidth: 520, textAlign: 'center' },
  bussola: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, backgroundColor: '#0008', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  seta: { color: cores.ouro, fontSize: 15, fontWeight: '900' },
  dist: { color: cores.texto, fontWeight: '800', fontSize: 11 },
  chefe: { position: 'absolute', top: 80, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  chefeNome: { color: '#ffb3a8', fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4 },
  barra: { width: 260, height: 9, backgroundColor: '#000b', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#ffb3a855' },
  barraVida: { height: 9, backgroundColor: '#c0392b' },
  aviso: { position: 'absolute', top: 130, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  avisoTxt: { color: '#fff', backgroundColor: '#2e7d32dd', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontWeight: '800', fontSize: 11, maxWidth: 480, textAlign: 'center' },
  dialogo: { position: 'absolute', bottom: 12, left: '27%', right: '27%', backgroundColor: '#120d08dd', borderRadius: 10, padding: 8, borderWidth: 2, borderColor: cores.ouro, zIndex: 50 },
  quem: { color: cores.ouro, fontWeight: '900', fontSize: 11, marginBottom: 2 },
  fala: { color: cores.texto, fontSize: 12, lineHeight: 16 },
  continuar: { color: cores.textoFraco, fontSize: 8, textAlign: 'right', marginTop: 3 },
  menuViagem: { position: 'absolute', alignSelf: 'center', top: '20%', left: '28%', right: '28%', backgroundColor: '#120d08f2', borderRadius: 14, padding: 14, gap: 8, borderWidth: 2, borderColor: cores.ouro, zIndex: 60 },
  menuTitulo: { color: cores.ouro, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  opcao: { backgroundColor: '#2b2117', borderRadius: 8, padding: 7, borderWidth: 1, borderColor: cores.ouroEscuro },
  opcaoTxt: { color: cores.texto, fontWeight: '800' },
  dicaCasa: { position: 'absolute', bottom: '30%', left: 0, right: 0, alignItems: 'center' },
  dicaTxt: { color: '#fff', backgroundColor: '#000b', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, fontWeight: '800', fontSize: 12, borderWidth: 1, borderColor: cores.ouro },
  viajando: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a1420e0', alignItems: 'center', justifyContent: 'center', zIndex: 70 },
  viajandoTxt: { color: cores.texto, fontSize: 18, fontWeight: '900' },
});

// Mini-mapa: mostra as ilhas dos clãs, você (seta) e a missão (estrela)
const TAM = 118, ESC = TAM / 1200;
function MiniMapa({ alvo }: { alvo?: [number, number] }) {
  const px = (x: number) => TAM / 2 + x * ESC;
  const rot = (Math.atan2(Math.sin(cameraInfo.yaw), Math.cos(cameraInfo.yaw)) * 180) / Math.PI;
  return (
    <View style={mm.caixa} pointerEvents="none">
      {ILHAS.map((i) => (
        <View key={i.id} style={[mm.ilha, { left: px(i.centro[0]) - i.raio * ESC, top: px(i.centro[1]) - i.raio * ESC, width: i.raio * ESC * 2, height: i.raio * ESC * 2, borderRadius: i.raio * ESC, borderColor: i.cor ?? '#d9c27a', backgroundColor: (i.cor ?? '#6f8f4a') + '88' }]} />
      ))}
      {ILHAS.filter((i) => i.id !== 'principal').map((i) => (
        <Text key={i.id + 't'} style={[mm.nome, { left: px(i.centro[0]) - 30, top: px(i.centro[1]) - 5 }]}>{i.dono === 'jogador' ? 'SEU CLÃ' : i.nome.replace('Ilha d', '').replace(/^[oa]s? /, '').toUpperCase()}</Text>
      ))}
      {alvo && <Text style={[mm.alvo, { left: px(alvo[0]) - 5, top: px(alvo[1]) - 7 }]}>★</Text>}
      <Text style={[mm.eu, { left: px(jogadorPos.x) - 5, top: px(jogadorPos.z) - 7, transform: [{ rotate: `${180 - rot}deg` }] }]}>▲</Text>
    </View>
  );
}
const mm = StyleSheet.create({
  caixa: { position: 'absolute', top: 76, left: 10, width: TAM, height: TAM, borderRadius: 10, backgroundColor: '#1b3a55cc', borderWidth: 1, borderColor: '#e8b64a88', overflow: 'hidden' },
  ilha: { position: 'absolute', borderWidth: 1 },
  nome: { position: 'absolute', width: 60, textAlign: 'center', color: '#fff', fontSize: 6, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 2 },
  alvo: { position: 'absolute', color: '#ffd36b', fontSize: 11, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 2 },
  eu: { position: 'absolute', color: '#fff', fontSize: 10, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 2 },
});

// Loja do comerciante da casa
function Loja() {
  const loja = useInterior((s) => s.loja);
  const mat = useJogo((s) => s.progresso?.materiais ?? {});
  const [msg, setMsg] = useState('');
  if (!loja) return null;
  const c = COMERCIANTE[loja];
  const preco = (o: Oferta) => Object.entries(o.preco).map(([k, v]) => `${v} ${k.replace('_', ' ')}`).join(' + ') || 'grátis';
  return (
    <View style={lj.caixa}>
      <Text style={lj.titulo}>💰 {c.nome} — {c.titulo}</Text>
      <Text style={lj.ouro}>Seu ouro: {mat.ouro ?? 0}   ·   ferro {mat.ferro ?? 0} · couro {mat.couro ?? 0} · madeira {mat.madeira ?? 0}</Text>
      {c.ofertas.map((o) => (
        <Pressable key={o.nome} style={lj.item} onPress={() => setMsg(comprar(o))}>
          <Text style={lj.nome}>{o.nome}</Text><Text style={lj.preco}>{preco(o)}</Text>
        </Pressable>
      ))}
      {!!msg && <Text style={lj.msg}>{msg}</Text>}
      <Pressable style={[lj.item, { justifyContent: 'center', borderColor: cores.ouro }]} onPress={() => { setMsg(''); useInterior.setState({ loja: null }); }}><Text style={lj.nome}>Fechar</Text></Pressable>
    </View>
  );
}
const lj = StyleSheet.create({
  caixa: { position: 'absolute', top: '8%', left: '30%', right: '30%', backgroundColor: '#120d08f0', borderRadius: 12, padding: 10, gap: 5, borderWidth: 2, borderColor: cores.ouro, zIndex: 80 },
  titulo: { color: cores.ouro, fontWeight: '900', fontSize: 14, textAlign: 'center' },
  ouro: { color: cores.textoFraco, fontSize: 10, textAlign: 'center', marginBottom: 2 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2b2117', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: cores.ouroEscuro },
  nome: { color: cores.texto, fontWeight: '800', fontSize: 12 },
  preco: { color: '#ffd36b', fontSize: 11, fontWeight: '700' },
  msg: { color: '#9be15d', fontSize: 11, textAlign: 'center', fontWeight: '800' },
});
