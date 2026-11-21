// Servidor online: contas por token, amigos, convites, salas de até 5, sincronização e sinalização da voz (WebRTC).
// Rodar: node server/index.js   (porta 8787). Dados ficam em server/dados.json.
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQ = path.join(__dirname, 'dados.json');
const db = fs.existsSync(ARQ) ? JSON.parse(fs.readFileSync(ARQ, 'utf8')) : { contas: {} };
const salvarDb = () => fs.writeFileSync(ARQ, JSON.stringify(db));
const conexoes = new Map(); // id -> ws
const salas = new Map();    // codigo -> { codigo, modo, membros: [] , dono }

const novoCodigo = (n) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
const mandar = (id, msg) => { const ws = conexoes.get(id); if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); };
const publico = (c) => ({ id: c.id, nome: c.nome, codigo: c.codigo, online: conexoes.has(c.id), emSala: c.sala || undefined });
const contaPorAlvo = (alvo) => Object.values(db.contas).find((c) => c.codigo === alvo.replace('#', '').toUpperCase() || c.nome.toLowerCase() === alvo.toLowerCase());

function enviarAmigos(id) {
  const c = db.contas[id]; if (!c) return;
  mandar(id, { tipo: 'amigos', amigos: c.amigos.map((a) => publico(db.contas[a])).filter(Boolean), pedidos: c.pedidos.map((a) => publico(db.contas[a])) });
}
const avisarAmigos = (id) => db.contas[id]?.amigos.forEach(enviarAmigos);

function enviarSala(codigo) {
  const s = salas.get(codigo); if (!s) return;
  const sala = { codigo, modo: s.modo, membros: s.membros };
  s.membros.forEach((m) => mandar(m.id, { tipo: 'sala', sala }));
}

function sairDaSala(id) {
  const c = db.contas[id]; if (!c?.sala) return;
  const s = salas.get(c.sala); c.sala = null;
  if (!s) return;
  s.membros = s.membros.filter((m) => m.id !== id);
  s.membros.forEach((m) => mandar(m.id, { tipo: 'voz_saiu', id }));
  if (!s.membros.length) salas.delete(s.codigo);
  else { if (!s.membros.some((m) => m.dono)) s.membros[0].dono = true; enviarSala(s.codigo); }
  mandar(id, { tipo: 'saiu_sala' });
}

const wss = new WebSocketServer({ port: Number(process.env.PORT) || 8787 });
wss.on('connection', (ws) => {
  let eu = null;
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.tipo === 'entrar') {
      let conta = Object.values(db.contas).find((c) => c.token && c.token === msg.token);
      if (!conta) {
        const id = crypto.randomUUID();
        conta = { id, token: crypto.randomBytes(24).toString('hex'), nome: String(msg.nome).slice(0, 20), codigo: novoCodigo(5), amigos: [], pedidos: [] };
        db.contas[id] = conta; salvarDb();
      }
      eu = conta.id; conexoes.set(eu, ws);
      ws.send(JSON.stringify({ tipo: 'bem_vindo', token: conta.token, eu: { id: eu, nome: conta.nome, codigo: conta.codigo },
        amigos: conta.amigos.map((a) => publico(db.contas[a])), pedidos: conta.pedidos.map((a) => publico(db.contas[a])) }));
      avisarAmigos(eu); return;
    }
    if (!eu) return;
    const c = db.contas[eu];
    switch (msg.tipo) {
      // ---- Amigos ----
      case 'amigo_adicionar': {
        const alvo = contaPorAlvo(String(msg.alvo || ''));
        if (!alvo || alvo.id === eu || c.amigos.includes(alvo.id)) break;
        if (c.pedidos.includes(alvo.id)) { // ele já tinha pedido: vira amizade
          c.pedidos = c.pedidos.filter((x) => x !== alvo.id); c.amigos.push(alvo.id); alvo.amigos.push(eu);
        } else if (!alvo.pedidos.includes(eu)) alvo.pedidos.push(eu);
        salvarDb(); enviarAmigos(eu); enviarAmigos(alvo.id); break;
      }
      case 'amigo_aceitar': {
        const o = db.contas[msg.id]; if (!o || !c.pedidos.includes(o.id)) break;
        c.pedidos = c.pedidos.filter((x) => x !== o.id); c.amigos.push(o.id); o.amigos.push(eu);
        salvarDb(); enviarAmigos(eu); enviarAmigos(o.id); break;
      }
      case 'amigo_recusar': c.pedidos = c.pedidos.filter((x) => x !== msg.id); salvarDb(); enviarAmigos(eu); break;
      case 'amigo_remover': {
        const o = db.contas[msg.id]; c.amigos = c.amigos.filter((x) => x !== msg.id);
        if (o) o.amigos = o.amigos.filter((x) => x !== eu);
        salvarDb(); enviarAmigos(eu); if (o) enviarAmigos(o.id); break;
      }
      case 'convidar':
        if (c.sala && c.amigos.includes(msg.id)) mandar(msg.id, { tipo: 'convite', de: publico(c), sala: c.sala }); break;

      // ---- Salas (até 5) ----
      case 'sala_criar': {
        sairDaSala(eu);
        let codigo; do codigo = novoCodigo(5); while (salas.has(codigo));
        salas.set(codigo, { codigo, modo: msg.modo, membros: [{ id: eu, nome: c.nome, heroi: msg.heroi, pronto: true, dono: true }] });
        c.sala = codigo; enviarSala(codigo); avisarAmigos(eu); break;
      }
      case 'sala_entrar': {
        const s = salas.get(String(msg.codigo)); if (!s || s.membros.length >= 5) break;
        sairDaSala(eu);
        s.membros.push({ id: eu, nome: c.nome, heroi: msg.heroi, pronto: false, dono: false });
        c.sala = s.codigo; enviarSala(s.codigo); avisarAmigos(eu); break;
      }
      case 'sala_sair': sairDaSala(eu); avisarAmigos(eu); break;
      case 'sala_pronto': {
        const s = salas.get(c.sala); const m = s?.membros.find((x) => x.id === eu); if (m) { m.pronto = !!msg.pronto; enviarSala(s.codigo); } break;
      }
      case 'sala_iniciar': {
        const s = salas.get(c.sala); if (!s?.membros.find((x) => x.id === eu)?.dono) break;
        s.emJogo = true;
        // dificuldade cresce com o número de jogadores
        s.membros.forEach((m) => mandar(m.id, { tipo: 'partida_iniciada', modo: s.modo, dificuldade: 1 + (s.membros.length - 1) * 0.35, dono: eu }));
        break;
      }
      // ---- Jogo: repassa posição/ações para os outros da sala ----
      case 'jogador': case 'acao': case 'progresso_grupo': {
        const s = salas.get(c.sala); if (!s) break;
        s.membros.forEach((m) => m.id !== eu && mandar(m.id, { ...msg, id: eu }));
        break;
      }
      // ---- Voz: sinalização WebRTC entre membros da mesma sala ----
      case 'voz_entrar': { const s = salas.get(c.sala); s?.membros.forEach((m) => m.id !== eu && mandar(m.id, { tipo: 'voz_entrou', id: eu })); break; }
      case 'voz_sinal': {
        const s = salas.get(c.sala);
        if (s?.membros.some((m) => m.id === msg.para)) mandar(msg.para, { tipo: 'voz_sinal', de: eu, dados: msg.dados });
        break;
      }
    }
  });
  ws.on('close', () => { if (!eu) return; conexoes.delete(eu); sairDaSala(eu); avisarAmigos(eu); });
});
console.log('Servidor da Sombra de Vila Rica rodando na porta', wss.options.port);
