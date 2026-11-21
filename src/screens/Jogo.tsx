import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas } from '../game/r3f';
import { Mundo } from '../game/Mundo';
import { PRESETS } from '../game/qualidade';
import { HUD } from '../ui/HUD';
import { Controles } from '../ui/Controles';
import { ligarTecladoMouse } from '../game/input';
import { iniciarAutoSave, salvarAgora } from '../state/save';
import { useJogo, type ModoCamera } from '../state/store';
import { cores, Botao } from '../ui/tema';

export function Jogo() {
  const { irPara, config, setConfig } = useJogo();
  const [pausado, setPausado] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const desligaSave = iniciarAutoSave();   // salva sozinho a cada 30s e ao sair/minimizar
    const desligaTeclas = ligarTecladoMouse();
    return () => { desligaSave(); desligaTeclas(); };
  }, []);

  const sairParaLobby = async () => { await salvarAgora(); irPara('menu'); };
  const salvarManual = async () => { await salvarAgora(); setAviso('Progresso salvo ✔'); setTimeout(() => setAviso(''), 2000); };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Canvas shadows dpr={PRESETS[config.qualidade].dpr} gl={{ antialias: config.qualidade !== 'baixo' }} camera={{ fov: 60, near: 0.1, far: PRESETS[config.qualidade].distancia, position: [0, 5, 8] }}>
        <Mundo />
      </Canvas>
      <HUD onPausar={() => setPausado(true)} />
      {!pausado && <Controles />}
      {!!aviso && <Text style={s.aviso}>{aviso}</Text>}
      {pausado && (
        <View style={s.pausa}>
          <Text style={s.titulo}>PAUSA</Text>
          <Botao texto="Continuar" onPress={() => setPausado(false)} />
          <Botao texto="Salvar agora" onPress={salvarManual} />
          <Text style={s.sub}>Câmera</Text>
          <View style={s.linha}>
            {(['terceira', 'cima', 'lateral'] as ModoCamera[]).map((m) => (
              <Botao key={m} texto={{ terceira: '3ª pessoa', cima: 'De cima', lateral: 'Lateral' }[m]} ativo={config.camera === m} onPress={() => setConfig({ camera: m })} />
            ))}
          </View>
          <Botao texto="Salvar e sair para o lobby" onPress={sairParaLobby} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pausa: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', gap: 10 },
  titulo: { color: cores.ouro, fontSize: 32, fontWeight: '900' }, sub: { color: cores.textoFraco, marginTop: 8 },
  linha: { flexDirection: 'row', gap: 8 },
  aviso: { position: 'absolute', bottom: 160, alignSelf: 'center', color: cores.texto, backgroundColor: '#000a', padding: 8, borderRadius: 8 },
});
