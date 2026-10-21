/* Recebe o feedback ("ajudou?") das ferramentas do site e guarda no banco D1 da Cloudflare.
   Precisa de um banco D1 ligado ao projeto com o nome (binding) DB. Veja o passo a passo no LEIA-ME.

   Dois tipos de envio, no mesmo endereço (/api/feedback):
   1) O voto:       { voto: "sim"|"nao", ferramenta: "guia"|"compare", beneficios?, contexto?, pessoas?, versao? }
                    Responde { ok, id, chave } para que um comentário possa ser ligado a este voto.
   2) O comentário: { id, chave, comentario, voto, ferramenta }
                    Se id e chave baterem, junta o comentário ao voto. Senão, grava como resposta nova.

   O que é guardado: sim/não, a ferramenta, o contexto do uso (sem dados pessoais), o comentário
   opcional e a data. O endereço de internet (IP) NÃO é guardado: só uma "impressão" embaralhada,
   válida por um dia, para limitar quem tenta mandar respostas demais. */

const LIMITE_POR_DIA = 30;
const FERRAMENTAS = ['guia', 'compare'];

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });

async function impressao(texto) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function chaveAleatoria() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function limpaTexto(t, max) {
  return String(t)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+\n/g, '\n')
    .trim()
    .slice(0, max);
}

/* O banco se atualiza sozinho: se ele foi criado numa versão antiga (sem as colunas novas),
   a função cria as tabelas e acrescenta as colunas que faltam. Nada é apagado. */
const COLUNAS_NOVAS = [
  ['ferramenta', "TEXT DEFAULT 'guia'"],
  ['contexto', 'TEXT'],
  ['comentario', 'TEXT'],
  ['chave', 'TEXT']
];
let bancoConferido = false;

async function prepararBanco(db) {
  if (bancoConferido) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      voto TEXT NOT NULL CHECK (voto IN ('sim', 'nao')),
      ferramenta TEXT DEFAULT 'guia', beneficios TEXT, contexto TEXT, pessoas INTEGER,
      versao_regras TEXT, comentario TEXT, chave TEXT)`),
    db.prepare('CREATE TABLE IF NOT EXISTS limites (chave TEXT PRIMARY KEY, dia TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0)')
  ]);
  const { results } = await db.prepare('PRAGMA table_info(feedback)').all();
  const existentes = new Set((results || []).map((c) => c.name));
  for (const [nome, tipo] of COLUNAS_NOVAS) {
    if (!existentes.has(nome)) {
      try { await db.prepare(`ALTER TABLE feedback ADD COLUMN ${nome} ${tipo}`).run(); }
      catch (e) { if (!/duplicate column/i.test(String(e && e.message))) throw e; }
    }
  }
  bancoConferido = true;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ ok: false, erro: 'use POST' }, 405);
  if (!env.DB) return json({ ok: false, erro: 'banco não configurado' }, 503);
  await prepararBanco(env.DB);

  // Só aceita envios vindos do próprio site.
  const origem = request.headers.get('Origin');
  if (origem && new URL(origem).host !== new URL(request.url).host) return json({ ok: false }, 403);

  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false }, 415);
  const texto = await request.text();
  if (texto.length > 4000) return json({ ok: false }, 413);

  let corpo;
  try { corpo = JSON.parse(texto); } catch { return json({ ok: false }, 400); }
  if (!corpo || typeof corpo !== 'object') return json({ ok: false }, 400);

  const voto = corpo.voto;
  if (voto !== 'sim' && voto !== 'nao') return json({ ok: false }, 400);
  const ferramenta = FERRAMENTAS.includes(corpo.ferramenta) ? corpo.ferramenta : 'guia';

  // Limite anti-spam: no máximo LIMITE_POR_DIA envios por conexão por dia.
  const dia = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') || 'desconhecido';
  const impr = await impressao(ip + '|' + dia + '|' + (env.SAL || 'guia-de-direitos'));
  const linha = await env.DB.prepare(
    'INSERT INTO limites (chave, dia, n) VALUES (?1, ?2, 1) ON CONFLICT(chave) DO UPDATE SET n = n + 1 RETURNING n'
  ).bind(impr, dia).first();
  if (linha && linha.n > LIMITE_POR_DIA) return json({ ok: false, erro: 'muitas respostas' }, 429);
  await env.DB.prepare('DELETE FROM limites WHERE dia < ?1').bind(dia).run();

  // --- Comentário ---
  if (typeof corpo.comentario === 'string') {
    const comentario = limpaTexto(corpo.comentario, 500);
    if (!comentario) return json({ ok: false }, 400);
    const id = Number.isInteger(corpo.id) ? corpo.id : null;
    const chave = typeof corpo.chave === 'string' && /^[0-9a-f]{32}$/.test(corpo.chave) ? corpo.chave : null;
    if (id && chave) {
      const r = await env.DB.prepare(
        'UPDATE feedback SET comentario = ?1 WHERE id = ?2 AND chave = ?3 AND comentario IS NULL'
      ).bind(comentario, id, chave).run();
      if (r.meta && r.meta.changes > 0) return json({ ok: true });
    }
    // Não deu para ligar ao voto (sem internet na hora do voto, por exemplo): grava como resposta nova.
    await env.DB.prepare('INSERT INTO feedback (voto, ferramenta, comentario) VALUES (?1, ?2, ?3)')
      .bind(voto, ferramenta, comentario).run();
    return json({ ok: true });
  }

  // --- Voto ---
  const beneficios = Array.isArray(corpo.beneficios)
    ? corpo.beneficios.filter((b) => typeof b === 'string').slice(0, 15).map((b) => limpaTexto(b, 80)).filter(Boolean).join(' | ')
    : '';
  const contexto = typeof corpo.contexto === 'string' ? limpaTexto(corpo.contexto, 120) : '';
  const pessoas = Number.isInteger(corpo.pessoas) && corpo.pessoas >= 1 && corpo.pessoas <= 90 ? corpo.pessoas : null;
  const versao = typeof corpo.versao === 'string' ? limpaTexto(corpo.versao, 20) : '';
  const chave = chaveAleatoria();

  const novo = await env.DB.prepare(
    'INSERT INTO feedback (voto, ferramenta, beneficios, contexto, pessoas, versao_regras, chave) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id'
  ).bind(voto, ferramenta, beneficios, contexto, pessoas, versao, chave).first();

  return json({ ok: true, id: novo ? novo.id : null, chave });
}
