// Chamada de voz do grupo (até 5): cada jogador conecta direto com os outros (malha WebRTC).
// Web usa o WebRTC do navegador; Android/iPhone usam react-native-webrtc (precisa de build EAS, não roda no Expo Go).
import { Platform } from 'react-native';
import { enviar, ouvir } from './client';
import { rtc } from './rtc';
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const pares = new Map<string, any>();
let microfone: any = null;
let desligarOuvinte: (() => void) | null = null;
let mudo = false;

async function criarPar(id: string, iniciar: boolean) {
  const pc = new rtc.RTCPeerConnection(ICE);
  pares.set(id, pc);
  microfone?.getTracks().forEach((t: any) => pc.addTrack(t, microfone));
  pc.onicecandidate = (e: any) => e.candidate && enviar('voz_sinal', { para: id, dados: { ice: e.candidate } });
  pc.ontrack = (e: any) => {
    if (Platform.OS === 'web') { const a = new Audio(); a.srcObject = e.streams[0]; a.autoplay = true; a.play().catch(() => {}); (pc as any)._audio = a; }
    // no celular o áudio remoto toca sozinho pelo react-native-webrtc
  };
  if (iniciar) {
    const oferta = await pc.createOffer({}); await pc.setLocalDescription(oferta);
    enviar('voz_sinal', { para: id, dados: { sdp: pc.localDescription } });
  }
  return pc;
}

export async function entrarNaCall() {
  if (microfone) return;
  microfone = await rtc.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
  desligarOuvinte = ouvir(async (msg) => {
    if (msg.tipo === 'voz_entrou') await criarPar(msg.id, true);
    if (msg.tipo === 'voz_saiu') { pares.get(msg.id)?.close(); pares.delete(msg.id); }
    if (msg.tipo === 'voz_sinal') {
      const pc = pares.get(msg.de) ?? (await criarPar(msg.de, false));
      const { sdp, ice } = msg.dados;
      if (sdp) {
        await pc.setRemoteDescription(new rtc.RTCSessionDescription(sdp));
        if (sdp.type === 'offer') { const r = await pc.createAnswer(); await pc.setLocalDescription(r); enviar('voz_sinal', { para: msg.de, dados: { sdp: pc.localDescription } }); }
      } else if (ice) await pc.addIceCandidate(new rtc.RTCIceCandidate(ice));
    }
  });
  enviar('voz_entrar');
}

export function alternarMudo() {
  mudo = !mudo; microfone?.getAudioTracks().forEach((t: any) => (t.enabled = !mudo)); return mudo;
}

export function sairDaCall() {
  pares.forEach((pc) => pc.close()); pares.clear();
  microfone?.getTracks().forEach((t: any) => t.stop()); microfone = null;
  desligarOuvinte?.(); desligarOuvinte = null;
}
