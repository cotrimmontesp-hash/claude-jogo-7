// Som do jogo, todo gerado na hora com Web Audio (sem arquivos para baixar):
// passos, galope, espada, acertos, dano, pulo, ambiente (vento, mar, fogo, pássaros, grilos) e música.
type Efeito = 'passo' | 'passoAgua' | 'galope' | 'espada' | 'espadaForte' | 'acerto' | 'dano' | 'pulo' | 'missao' | 'chefe' | 'canoa' | 'fala' | 'morte';

let ctx: AudioContext | null = null;
let mestre: GainNode, efeitos: GainNode, ambienteG: GainNode, musicaG: GainNode;
let ruidoBuf: AudioBuffer;
const camadas: Record<string, GainNode> = {};
let volume = 0.8;
let proxNotaMusica = 0, compasso = 0, tensao = 0, alvoTensao = 0, noite = false, ultimoPassaro = 0, ultimoGrilo = 0, ultimoEstalo = 0;
let ativo = true;

function criarRuido(c: AudioContext) {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function laco(nome: string, filtro: BiquadFilterType, freq: number, q = 0.7) {
  const c = ctx!; const src = c.createBufferSource(); src.buffer = ruidoBuf; src.loop = true;
  const f = c.createBiquadFilter(); f.type = filtro; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(ambienteG); src.start();
  camadas[nome] = g; return f;
}

export function iniciarSom() {
  if (ctx || typeof window === 'undefined') { ctx?.state === 'suspended' && ctx.resume(); return; }
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
  ctx = new AC() as AudioContext;
  mestre = ctx.createGain(); mestre.gain.value = volume; mestre.connect(ctx.destination);
  efeitos = ctx.createGain(); efeitos.gain.value = 0.9; efeitos.connect(mestre);
  ambienteG = ctx.createGain(); ambienteG.gain.value = 0.55; ambienteG.connect(mestre);
  musicaG = ctx.createGain(); musicaG.gain.value = 0.22; musicaG.connect(mestre);
  ruidoBuf = criarRuido(ctx);
  // vento com rajadas
  const fv = laco('vento', 'bandpass', 420, 0.6);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(fv.frequency); lfo.start();
  // mar: ondas que vão e voltam
  laco('mar', 'lowpass', 650, 0.4);
  const lmar = ctx.createOscillator(); lmar.frequency.value = 0.13; const lmg = ctx.createGain(); lmg.gain.value = 0;
  lmar.connect(lmg); lmar.start(); camadas.marLfo = lmg; lmg.connect(camadas.mar.gain);
  // fogo: chiado grave (os estalos são tocados à parte)
  laco('fogo', 'lowpass', 900, 0.5);
  // rio
  laco('rio', 'highpass', 1400, 0.3);
  proxNotaMusica = ctx.currentTime + 1;
  if (document.visibilityState) document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ativo && ctx.resume(); });
}

/** Liga o som na primeira vez que a pessoa toca na tela / aperta uma tecla (o navegador exige isso). */
export function prepararSom() {
  if (typeof window === 'undefined') return;
  const f = () => iniciarSom();
  window.addEventListener('pointerdown', f, { passive: true });
  window.addEventListener('touchstart', f, { passive: true });
  window.addEventListener('keydown', f);
}

export function definirVolume(v: number) { volume = v; if (ctx) mestre.gain.setTargetAtTime(v, ctx.currentTime, 0.1); }
export function pausarSom(p: boolean) { ativo = !p; if (!ctx) return; p ? ctx.suspend() : ctx.resume(); }

function env(g: GainNode, t: number, pico: number, ataque: number, queda: number) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pico, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + queda);
}
function ruido(t: number, dur: number, tipo: BiquadFilterType, freq: number, pico: number, q = 1, freqFim?: number, destino: AudioNode = efeitos) {
  const c = ctx!; const s = c.createBufferSource(); s.buffer = ruidoBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = c.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqFim) f.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
  const g = c.createGain(); env(g, t, pico, Math.min(0.01, dur * 0.2), dur);
  s.connect(f).connect(g).connect(destino); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function tom(t: number, freq: number, dur: number, pico: number, tipo: OscillatorType = 'sine', freqFim?: number, destino: AudioNode = efeitos, ataque = 0.01) {
  const c = ctx!; const o = c.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
  const g = c.createGain(); env(g, t, pico, ataque, dur);
  o.connect(g).connect(destino); o.start(t); o.stop(t + ataque + dur + 0.05);
}

export function tocar(e: Efeito, forca = 1) {
  if (!ctx || !ativo) return; const t = ctx.currentTime;
  const v = (x: number) => x * (0.85 + Math.random() * 0.3);
  switch (e) {
    case 'passo': ruido(t, 0.09, 'lowpass', v(700), 0.22 * forca, 0.8); tom(t, v(70), 0.06, 0.12 * forca, 'sine', 40); break;
    case 'passoAgua': ruido(t, 0.18, 'bandpass', v(1300), 0.25, 1.5, 500); break;
    case 'galope': [0, 0.07].forEach((d) => { tom(t + d, v(95), 0.08, 0.35, 'triangle', 45); ruido(t + d, 0.05, 'lowpass', 500, 0.2); }); break;
    case 'espada': ruido(t, 0.22, 'bandpass', 3200, 0.35, 2.5, 900); break;
    case 'espadaForte': ruido(t, 0.32, 'bandpass', 2400, 0.45, 2, 500); tom(t, 160, 0.25, 0.08, 'sawtooth', 70); break;
    case 'acerto': ruido(t, 0.12, 'lowpass', 1800, 0.55, 1); tom(t, v(110), 0.14, 0.45, 'sine', 50);
      tom(t, v(1900), 0.25, 0.06, 'square', 1500); break;    // um "tlim" de metal
    case 'dano': tom(t, 220, 0.18, 0.25, 'sawtooth', 110); ruido(t, 0.1, 'lowpass', 900, 0.3); break;
    case 'pulo': ruido(t, 0.12, 'lowpass', 600, 0.2); break;
    case 'missao': [523, 659, 784, 1047].forEach((f, i) => tom(t + i * 0.13, f, 0.5, 0.18, 'triangle', undefined, efeitos, 0.02)); break;
    case 'chefe': [98, 147].forEach((f) => tom(t, f, 2.2, 0.25, 'sawtooth', f * 0.98, efeitos, 0.4)); ruido(t, 1.5, 'lowpass', 200, 0.3); break;
    case 'canoa': for (let i = 0; i < 3; i++) ruido(t + i * 0.45, 0.35, 'bandpass', 700, 0.3, 1.2, 300); break;
    case 'fala': tom(t, 660, 0.08, 0.06, 'triangle'); break;
    case 'morte': tom(t, 196, 1.6, 0.2, 'triangle', 98, efeitos, 0.05); break;
  }
}

// ---------------- ambiente e música ----------------
// escala modal (dórico em Ré) — soa antigo, "colonial"
const ESCALA = [146.8, 164.8, 174.6, 196, 220, 246.9, 261.6, 293.7, 329.6, 349.2, 392];
const ACORDES = [[0, 2, 4], [3, 5, 7], [1, 3, 5], [4, 6, 8]];

function tocarMusica() {
  const c = ctx!; const agora = c.currentTime;
  const bpm = 64 + tensao * 56; const tempo = 60 / bpm;
  while (proxNotaMusica < agora + 0.3) {
    const t = proxNotaMusica; const passo = compasso % 16; const ac = ACORDES[Math.floor(compasso / 16) % ACORDES.length];
    if (passo === 0) ac.forEach((i) => tom(t, ESCALA[i] / 2, tempo * 15, 0.09, 'triangle', undefined, musicaG, 1.2));   // fundo
    if (passo % 2 === 0 && Math.random() < (noite ? 0.35 : 0.5)) {                        // melodia de viola
      const n = ESCALA[ac[Math.floor(Math.random() * 3)] + (Math.random() < 0.5 ? 2 : 0)] * 2;
      tom(t, n, tempo * 1.6, 0.07, 'triangle', undefined, musicaG, 0.005);
      tom(t, n * 2.01, tempo * 0.6, 0.015, 'sine', undefined, musicaG, 0.005);
    }
    if (tensao > 0.3) {                                                              // tambores de guerra
      if (passo % 4 === 0) { tom(t, 75, 0.3, 0.35 * tensao, 'sine', 40, musicaG); }
      if (passo % 4 === 2 && Math.random() < 0.7) ruido(t, 0.08, 'bandpass', 1800, 0.12 * tensao, 1, undefined, musicaG);
    }
    compasso++; proxNotaMusica += tempo / 2;
  }
}

export interface EstadoAmbiente { distMar: number; distFogo: number; distRio: number; hora: number; combate: boolean; montado: boolean }
/** Chamado algumas vezes por segundo pelo mundo. */
export function atualizarAmbiente(a: EstadoAmbiente) {
  if (!ctx || !ativo) return; const t = ctx.currentTime;
  noite = a.hora < 5.5 || a.hora > 19;
  const set = (n: string, v: number) => camadas[n]?.gain.setTargetAtTime(v, t, 0.6);
  set('vento', 0.18 + (noite ? 0.05 : 0));
  const mar = Math.max(0, 1 - a.distMar / 45);
  set('mar', 0.45 * mar); camadas.marLfo?.gain.setTargetAtTime(0.25 * mar, t, 0.6);
  const fogo = Math.max(0, 1 - a.distFogo / 30);
  set('fogo', 0.5 * fogo);
  if (fogo > 0.05 && t > ultimoEstalo) { ultimoEstalo = t + 0.05 + Math.random() * 0.25; ruido(t, 0.03, 'highpass', 2500, 0.25 * fogo, 1, undefined, ambienteG); }
  set('rio', 0.12 * Math.max(0, 1 - a.distRio / 18));
  // pássaros de dia, grilos de noite
  if (!noite && !a.combate && t > ultimoPassaro) {
    ultimoPassaro = t + 2 + Math.random() * 5;
    const f = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tom(t + i * 0.11, f, 0.07, 0.035, 'sine', f * (Math.random() < 0.5 ? 1.3 : 0.75), ambienteG, 0.01);
  }
  if (noite && t > ultimoGrilo) {
    ultimoGrilo = t + 0.6 + Math.random() * 1.2;
    for (let i = 0; i < 4; i++) tom(t + i * 0.045, 4400 + Math.random() * 200, 0.025, 0.02, 'square', undefined, ambienteG, 0.003);
  }
  alvoTensao = a.combate ? 1 : 0; tensao += (alvoTensao - tensao) * 0.05;
  tocarMusica();
}
