import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform, View } from 'react-native';
import { useJogo } from './src/state/store';
import { Lobby } from './src/screens/Lobby';
import { Modos } from './src/screens/Modos';
import { Personagem } from './src/screens/Personagem';
import { Jogo } from './src/screens/Jogo';
import { Config } from './src/screens/Config';
import { Forja } from './src/screens/Forja';
import { Cla } from './src/screens/Cla';
import { conectar } from './src/net/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Protecao } from './src/ui/Protecao';
import { Orientacao } from './src/ui/Orientacao';

export default function App() {
  const tela = useJogo((s) => s.tela);
  const config = useJogo((s) => s.config);

  useEffect(() => {
    if (Platform.OS !== 'web') ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    // configurações também ficam salvas
    AsyncStorage.getItem('sombra:config').then((c) => c && useJogo.getState().setConfig(JSON.parse(c)));
    AsyncStorage.getItem('sombra:nome').then((n) => conectar(n ?? `Jogador${Math.floor(Math.random() * 9999)}`)).catch(() => {});
  }, []);
  useEffect(() => { AsyncStorage.setItem('sombra:config', JSON.stringify(config)); }, [config]);

  return (
    <Protecao>
    <View style={{ flex: 1, backgroundColor: '#120d08' }}>
      <StatusBar hidden />
      {tela === 'menu' && <Lobby />}
      {tela === 'modo' && <Modos />}
      {tela === 'personagem' && <Personagem />}
      {tela === 'jogo' && <Jogo />}
      {tela === 'config' && <Config />}
      {tela === 'forja' && <Forja />}
      {tela === 'cla' && <Cla />}
      <Orientacao />
    </View>
    </Protecao>
  );
}
