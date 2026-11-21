// Lobby misturando dois estilos:
//  • abas no topo + grupo de até 5 heróis lado a lado com vagas "+" (estilo Fortnite)
//  • menu de ícones na lateral, barra de nível/moedas, cartão de modo + botão JOGAR grande
//    no canto e lista de amigos deslizante à direita (estilo Free Fire)
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useJogo } from '../state/store';
import { MODOS } from '../data/modes';
import { HEROIS } from '../data/characters';
import { listarSaves, carregar } from '../state/save';
import { useOnline, criarSala, entrarSala, sairSala, marcarPronto, iniciarPartida } from '../net/client';
import { Amigos } from './Amigos';
import { GrupoPreview } from '../game/GrupoPreview';
import { cores, Botao } from '../ui/tema';

const ABAS = ['LOBBY', 'HISTÓRIA', 'CLÃ', 'ARSENAL', 'FORJA', 'CONQUISTAS'] as const;
const MENU_LATERAL = [
  { icone: '📜', nome: 'Missões' }, { icone: '🎁', nome: 'Prêmio diário' },
  { icone: '🐆', nome: 'Bestiário' }, { icone: '🏆', nome: 'Ranking' }, { icone: '✉️', nome: 'Mensagens' },
];

export function Lobby() {
  const { irPara, modoEscolhido, setProgresso, setSlot } = useJogo();
  const { sala, eu, conectado, convites, amigos, set } = useOnline();
  const [saves, setSaves] = useState<any[]>([]);
  const [heroi, setHeroi] = useState<'ines' | 'tome'>('ines');
  const [aba, setAba] = useState<(typeof ABAS)[number]>('LOBBY');
  const [amigosAberto, setAmigosAberto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const modo = MODOS.find((m) => m.id === modoEscolhido)!;
  const souDono = !sala || sala.membros.find((m) => m.id === eu?.id)?.dono;
  const ultimoSave = saves.find(Boolean);

  useEffect(() => { listarSaves().then(setSaves); }, []);

  const membros = sala?.membros ?? [{ id: 'eu', nome: eu?.nome ?? 'Você', heroi, pronto: true, dono: true }];

  const jogar = async () => {
    if (!modo.online) {
      if (ultimoSave) { const i = saves.indexOf(ultimoSave); setSlot(i); setProgresso(await carregar(i)); irPara('jogo'); }
      else irPara('personagem');
      return;
    }
    if (!sala) criarSala(modo.id, heroi);
    else if (souDono) iniciarPartida();
    else marcarPronto(true);
  };

  return (
    <View style={s.tela}>
      {/* Grupo de heróis em 3D ao fundo (modelos do Blender) */}
      <GrupoPreview membros={membros} onVagaLivre={() => setAmigosAberto(true)} />

      {/* TOPO: perfil + abas + moedas */}
      <View style={s.topo}>
        <View style={s.perfil}>
          <View style={s.avatar}><Text>{heroi === 'ines' ? '🗡️' : '🪓'}</Text></View>
          <View>
            <Text style={s.nome}>{eu?.nome ?? 'Jogador'}</Text>
            <View style={s.barraNivel}><View style={[s.barraNivelCheia, { width: '40%' }]} /></View>
            <Text style={s.fraco}>Nv. 1 · {conectado ? '🟢 Online' : '⚫ Offline'}</Text>
          </View>
        </View>
        <View style={s.abas}>
          {ABAS.map((a) => (
            <Pressable key={a} onPress={() => (a === 'FORJA' || a === 'ARSENAL' ? irPara('forja') : a === 'CLÃ' ? irPara('cla') : setAba(a))}>
              <Text style={[s.aba, aba === a && s.abaAtiva]}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.moedas}>
          <Text style={s.moeda}>🪙 0</Text><Text style={s.moeda}>💎 0</Text>
          <Pressable onPress={() => irPara('config')}><Text style={s.moeda}>⚙</Text></Pressable>
        </View>
      </View>

      {/* LATERAL ESQUERDA: menu de ícones */}
      <View style={s.lateral}>
        {MENU_LATERAL.map((m) => (
          <Pressable key={m.nome} style={s.icone}>
            <Text style={{ fontSize: 20 }}>{m.icone}</Text>
            <Text style={s.iconeTxt}>{m.nome}</Text>
          </Pressable>
        ))}
      </View>

      {/* Troca de herói logo abaixo do grupo */}
      <View style={s.trocaHeroi}>
        {HEROIS.map((h) => <Botao key={h.id} texto={h.nome} ativo={heroi === h.id} onPress={() => setHeroi(h.id)} />)}
      </View>

      {/* CANTO DIREITO INFERIOR: cartão do modo + JOGAR */}
      <View style={s.cantoJogar}>
        {sala && <Text style={s.fraco}>Sala {sala.codigo} · {sala.membros.length}/5 {souDono ? '· você é o líder' : ''}</Text>}
        <Pressable style={s.cartaoModo} onPress={() => irPara('modo')}>
          <Text style={s.fraco}>MODO DE JOGO ▸ trocar</Text>
          <Text style={s.modoNome}>{modo.nome}</Text>
          <Text style={s.fraco}>{modo.maxJogadores > 1 ? `Até ${modo.maxJogadores} jogadores` : 'Solo'}{ultimoSave && !modo.online ? ` · Continuar Cap. ${ultimoSave.capitulo}` : ''}</Text>
        </Pressable>
        <Botao grande texto={!modo.online ? (ultimoSave ? 'CONTINUAR' : 'JOGAR') : sala ? (souDono ? 'INICIAR' : 'PRONTO') : 'JOGAR'} onPress={jogar} />
        {sala && <Botao texto="Sair da sala" onPress={sairSala} />}
      </View>

      {/* Botão de amigos (direita) */}
      <Pressable style={s.botaoAmigos} onPress={() => setAmigosAberto(!amigosAberto)}>
        <Text style={s.iconeTxt}>👥 {amigos.filter((a) => a.online).length}</Text>
        {convites.length > 0 && <View style={s.bolinha}><Text style={s.bolinhaTxt}>{convites.length}</Text></View>}
      </Pressable>

      {/* PAINEL DE AMIGOS deslizante */}
      {amigosAberto && (
        <View style={s.painelAmigos}>
          <View style={s.linhaEntre}>
            <Text style={s.modoNome}>Amigos</Text>
            <Pressable onPress={() => setAmigosAberto(false)}><Text style={s.nome}>✕</Text></Pressable>
          </View>
          {convites.map((c, i) => (
            <View key={i} style={s.convite}>
              <Text style={s.nome}>{c.de.nome} te convidou</Text>
              <Botao texto="Entrar" onPress={() => { entrarSala(c.sala, heroi); set({ convites: convites.filter((_, j) => j !== i) }); }} />
            </View>
          ))}
          {!sala && (
            <View style={s.linha}>
              <TextInput style={s.input} value={codigo} onChangeText={setCodigo} placeholder="Código da sala" placeholderTextColor="#887" autoCapitalize="characters" maxLength={5} />
              <Botao texto="Entrar" onPress={() => codigo && entrarSala(codigo, heroi)} />
            </View>
          )}
          <Amigos />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: '#0008' },
  perfil: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 8, backgroundColor: cores.ouroEscuro, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: cores.ouro },
  nome: { color: cores.texto, fontWeight: '800' }, fraco: { color: cores.textoFraco, fontSize: 11 },
  barraNivel: { width: 90, height: 5, backgroundColor: '#000a', borderRadius: 3, marginVertical: 2 },
  barraNivelCheia: { height: 5, backgroundColor: cores.ouro, borderRadius: 3 },
  abas: { flexDirection: 'row', gap: 18 },
  aba: { color: cores.textoFraco, fontWeight: '900', fontSize: 14, letterSpacing: 1, paddingBottom: 4 },
  abaAtiva: { color: cores.texto, borderBottomWidth: 3, borderColor: cores.ouro },
  moedas: { flexDirection: 'row', gap: 12 },
  moeda: { color: cores.texto, fontWeight: '800', backgroundColor: '#0009', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  lateral: { position: 'absolute', left: 10, top: 80, gap: 10 },
  icone: { width: 64, alignItems: 'center', backgroundColor: cores.painel, borderRadius: 10, padding: 6, borderWidth: 1, borderColor: cores.ouroEscuro },
  iconeTxt: { color: cores.texto, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  trocaHeroi: { position: 'absolute', bottom: 20, alignSelf: 'center', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cantoJogar: { position: 'absolute', right: 16, bottom: 16, width: 240, gap: 8 },
  cartaoModo: { backgroundColor: cores.painel, borderRadius: 10, padding: 10, borderLeftWidth: 4, borderColor: cores.ouro },
  modoNome: { color: cores.ouro, fontWeight: '900', fontSize: 18 },
  botaoAmigos: { position: 'absolute', right: 16, top: 80, backgroundColor: cores.painel, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: cores.ouroEscuro },
  bolinha: { position: 'absolute', top: -6, right: -6, backgroundColor: cores.vermelho, borderRadius: 9, minWidth: 18, alignItems: 'center' },
  bolinhaTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  painelAmigos: { position: 'absolute', right: 0, top: 60, bottom: 0, width: 300, backgroundColor: '#140f0af2', padding: 12, gap: 8, borderLeftWidth: 1, borderColor: cores.ouroEscuro },
  linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linha: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  convite: { backgroundColor: '#3a2a10', padding: 8, borderRadius: 8, gap: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: cores.ouro, color: cores.texto, borderRadius: 8, padding: 8 },
});
