import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';
import { t as traduzir } from '@/i18n';

/*
 * Rede social da Radiola (RF057–RF077): perfis, amizades, feed, grupos.
 *
 * Regra de ouro de privacidade, aplicada em TODA consulta do mock
 * (e que o back-end PHP precisa repetir):
 *   - item só aparece para outra pessoa se publico = true
 *   - post "amigos" só aparece para amigos; "privado" só para o autor
 *   - bloqueado não vê nada
 * O front esconder não é segurança; mas o mock já se comporta como a API
 * deve se comportar, então ele serve de "especificação viva" para o PHP.
 */

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

const resumo = (u) => (u ? { id: u.id, nome: u.nome, apelido: u.apelido } : null);

// ---------- regras de relacionamento ----------
function amizadeEntre(db, a, b) {
  return db.amizades.find(
    (x) => (x.id_usuario_1 === a && x.id_usuario_2 === b) || (x.id_usuario_1 === b && x.id_usuario_2 === a),
  );
}

function idsAmigos(db, id) {
  return db.amizades
    .filter((x) => x.status === 'ativa' && (x.id_usuario_1 === id || x.id_usuario_2 === id))
    .map((x) => (x.id_usuario_1 === id ? x.id_usuario_2 : x.id_usuario_1));
}

/** Como "eu" me relaciono com "outro": eu | amigos | enviada | recebida | bloqueado | nenhuma */
function relacao(db, meuId, outroId) {
  if (meuId === outroId) return { tipo: 'eu' };
  const a = amizadeEntre(db, meuId, outroId);
  if (!a || a.status === 'recusada') return { tipo: 'nenhuma' };
  if (a.status === 'ativa') return { tipo: 'amigos', id_amizade: a.id };
  if (a.status === 'bloqueada') return { tipo: 'bloqueado', id_amizade: a.id, fui_eu: a.acao_usuario_1 === meuId };
  return { tipo: a.id_usuario_1 === meuId ? 'enviada' : 'recebida', id_amizade: a.id };
}

function podeVerPost(db, meuId, post) {
  if (post.id_usuario === meuId || post.id_destinatario === meuId) return true;
  const rel = relacao(db, meuId, post.id_usuario).tipo;
  if (rel === 'bloqueado') return false;
  if (post.visibilidade === 'publico') return true;
  return post.visibilidade === 'amigos' && rel === 'amigos';
}

/** Junta autor, curtidas e comentários no post (o "JOIN" que a API faria). */
function enriquecerPost(db, meuId, post) {
  const interacoes = db.interacoes.filter((i) => i.id_post === post.id);
  const usuario = (id) => resumo(db.usuarios.find((u) => u.id === id));
  return {
    ...post,
    autor: usuario(post.id_usuario),
    destinatario: post.id_destinatario ? usuario(post.id_destinatario) : null,
    curtidas: interacoes.filter((i) => i.tipo === 'curtir').length,
    curtiu: interacoes.some((i) => i.tipo === 'curtir' && i.id_usuario === meuId),
    comentarios: interacoes
      .filter((i) => i.tipo === 'comentar')
      .map((c) => ({ id: c.id, texto: c.comentario_texto, data: c.data_interacao, autor: usuario(c.id_usuario) })),
  };
}

const maisRecentes = (a, b) => b.data_publicacao.localeCompare(a.data_publicacao);

function estatisticasDe(itens) {
  const porTipo = {};
  itens.forEach((i) => (porTipo[i.tipo_midia] = (porTipo[i.tipo_midia] || 0) + 1));
  return {
    total: itens.length,
    porTipo,
    generos: new Set(itens.map((i) => i.genero).filter(Boolean)).size,
    paises: new Set(itens.map((i) => i.pais_origem).filter(Boolean)).size,
  };
}

export const socialService = {
  // ================= PERFIS (RF057, RF059) =================
  async perfilPublico(apelido) {
    if (!USE_MOCK) return http(`/perfis/${encodeURIComponent(apelido)}`);
    await atraso();
    const db = mockDb.ler();
    const meuId = eu();
    const usuario = db.usuarios.find((u) => u.apelido === apelido);
    if (!usuario) throw new ApiError(traduzir('erros.perfil404'), 404);

    const rel = relacao(db, meuId, usuario.id);
    if (rel.tipo === 'bloqueado' && !rel.fui_eu) throw new ApiError(traduzir('erros.perfil404'), 404);

    const todosItens = db.itens.filter((i) => i.id_usuario === usuario.id);
    const visiveis = rel.tipo === 'eu' ? todosItens : todosItens.filter((i) => i.publico);

    return {
      usuario: { ...resumo(usuario), bio: usuario.bio, data_cadastro: usuario.data_cadastro, plano: usuario.plano },
      relacao: rel,
      estatisticas: estatisticasDe(todosItens), // números gerais são públicos; os itens não
      estante: visiveis.map(({ id, titulo, artista, tipo_midia, ano_lancamento, cor_capa, capa_imagem, publico }) => ({
        id, titulo, artista, tipo_midia, ano_lancamento, cor_capa, capa_imagem, publico,
      })),
      amigos: idsAmigos(db, usuario.id).length,
      posts: db.posts
        .filter((p) => p.id_usuario === usuario.id && podeVerPost(db, meuId, p))
        .sort(maisRecentes)
        .map((p) => enriquecerPost(db, meuId, p)),
    };
  },

  async buscarUsuarios(termo) {
    if (!USE_MOCK) return http(`/usuarios?busca=${encodeURIComponent(termo)}`);
    await atraso(250);
    const db = mockDb.ler();
    const meuId = eu();
    const t = termo.trim().toLowerCase();
    if (!t) return [];
    return db.usuarios
      .filter((u) => u.id !== meuId && !u.equipe && (u.nome.toLowerCase().includes(t) || u.apelido?.toLowerCase().includes(t)))
      .filter((u) => relacao(db, meuId, u.id).tipo !== 'bloqueado')
      .map((u) => ({ ...resumo(u), bio: u.bio, relacao: relacao(db, meuId, u.id) }));
  },

  // ================= AMIZADES (RF058–RF061) =================
  async amizades() {
    if (!USE_MOCK) return http('/amizades');
    await atraso();
    const db = mockDb.ler();
    const meuId = eu();
    const usuario = (id) => db.usuarios.find((u) => u.id === id);
    const linha = (a, outroId) => ({ id_amizade: a.id, desde: a.data_solicitacao, usuario: { ...resumo(usuario(outroId)), bio: usuario(outroId)?.bio } });

    const minhas = db.amizades.filter((a) => a.id_usuario_1 === meuId || a.id_usuario_2 === meuId);
    const outro = (a) => (a.id_usuario_1 === meuId ? a.id_usuario_2 : a.id_usuario_1);
    return {
      amigos: minhas.filter((a) => a.status === 'ativa').map((a) => linha(a, outro(a))),
      recebidas: minhas.filter((a) => a.status === 'pendente' && a.id_usuario_2 === meuId).map((a) => linha(a, a.id_usuario_1)),
      enviadas: minhas.filter((a) => a.status === 'pendente' && a.id_usuario_1 === meuId).map((a) => linha(a, a.id_usuario_2)),
      bloqueados: minhas.filter((a) => a.status === 'bloqueada' && a.acao_usuario_1 === meuId).map((a) => linha(a, outro(a))),
    };
  },

  async contarPendentes() {
    if (!USE_MOCK) return (await http('/amizades/pendentes')).total;
    const db = mockDb.ler();
    return db.amizades.filter((a) => a.status === 'pendente' && a.id_usuario_2 === eu()).length;
  },

  async solicitarAmizade(idUsuario) {
    if (!USE_MOCK) return http('/amizades', { method: 'POST', body: { id_usuario: idUsuario } });
    await atraso(250);
    const db = mockDb.ler();
    const meuId = eu();
    const existente = amizadeEntre(db, meuId, idUsuario);
    if (existente && existente.status !== 'recusada') throw new ApiError(traduzir('erros.solicitacaoExiste'), 409);
    if (existente) db.amizades = db.amizades.filter((a) => a !== existente);
    const nova = { id: mockDb.proximoId(db.amizades), id_usuario_1: meuId, id_usuario_2: idUsuario, status: 'pendente', data_solicitacao: new Date().toISOString() };
    db.amizades.push(nova);
    mockDb.salvar(db);
    return nova;
  },

  /** acao: 'aceitar' | 'recusar' | 'bloquear' */
  async responderAmizade(idAmizade, acao) {
    if (!USE_MOCK) return http(`/amizades/${idAmizade}`, { method: 'PATCH', body: { acao } });
    await atraso(250);
    const db = mockDb.ler();
    const meuId = eu();
    const a = db.amizades.find((x) => x.id === idAmizade && (x.id_usuario_1 === meuId || x.id_usuario_2 === meuId));
    if (!a) throw new ApiError(traduzir('erros.solicitacao404'), 404);
    // Só quem RECEBEU pode aceitar; bloquear vale para qualquer um dos dois
    if (acao === 'aceitar' && a.id_usuario_2 !== meuId) throw new ApiError(traduzir('erros.soQuemRecebeu'), 403);
    a.status = { aceitar: 'ativa', recusar: 'recusada', bloquear: 'bloqueada' }[acao];
    a.acao_usuario_1 = meuId;
    a.data_atualizacao = new Date().toISOString();
    mockDb.salvar(db);
    return a;
  },

  /** Bloquear alguém com quem você ainda não tem relação nenhuma (ou tem qualquer uma). */
  async bloquear(idUsuario) {
    if (!USE_MOCK) return http(`/usuarios/${idUsuario}/bloquear`, { method: 'POST' });
    await atraso(250);
    const db = mockDb.ler();
    const meuId = eu();
    const existente = amizadeEntre(db, meuId, idUsuario);
    if (existente) Object.assign(existente, { status: 'bloqueada', acao_usuario_1: meuId });
    else db.amizades.push({ id: mockDb.proximoId(db.amizades), id_usuario_1: meuId, id_usuario_2: idUsuario, status: 'bloqueada', acao_usuario_1: meuId, data_solicitacao: new Date().toISOString() });
    mockDb.salvar(db);
    return { ok: true };
  },

  /** Desfazer amizade, cancelar pedido enviado ou desbloquear. */
  async removerAmizade(idAmizade) {
    if (!USE_MOCK) return http(`/amizades/${idAmizade}`, { method: 'DELETE' });
    await atraso(250);
    const db = mockDb.ler();
    const meuId = eu();
    db.amizades = db.amizades.filter((x) => !(x.id === idAmizade && (x.id_usuario_1 === meuId || x.id_usuario_2 === meuId)));
    mockDb.salvar(db);
    return { ok: true };
  },

  /** RF058 – convite por e-mail; devolve o link para compartilhar. */
  async convidar(email) {
    if (!USE_MOCK) return http('/convites', { method: 'POST', body: { email } });
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    const codigo = `${meuId}-${Date.now().toString(36)}`;
    db.convites.push({ id_usuario: meuId, email: email || null, codigo, data: new Date().toISOString() });
    mockDb.salvar(db);
    return { link: `${window.location.origin}/cadastro?convite=${codigo}` };
  },

  // ================= FEED (RF062–RF068) =================
  async feed() {
    if (!USE_MOCK) return http('/feed');
    await atraso();
    const db = mockDb.ler();
    const meuId = eu();
    const circulo = new Set([meuId, ...idsAmigos(db, meuId)]);
    return db.posts
      .filter((p) => (circulo.has(p.id_usuario) || p.id_destinatario === meuId) && podeVerPost(db, meuId, p))
      .sort(maisRecentes)
      .map((p) => enriquecerPost(db, meuId, p));
  },

  async publicar(dados) {
    if (!USE_MOCK) return http('/posts', { method: 'POST', body: dados });
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    const post = {
      id: mockDb.proximoId(db.posts),
      id_usuario: meuId,
      visibilidade: 'amigos',
      ...dados,
      data_publicacao: new Date().toISOString(),
    };
    db.posts.push(post);
    mockDb.salvar(db);
    return enriquecerPost(db, meuId, post);
  },

  async excluirPost(idPost) {
    if (!USE_MOCK) return http(`/posts/${idPost}`, { method: 'DELETE' });
    await atraso(200);
    const db = mockDb.ler();
    const meuId = eu();
    db.posts = db.posts.filter((p) => !(p.id === idPost && p.id_usuario === meuId));
    // Apaga curtidas e comentários órfãos (no banco seria o ON DELETE CASCADE)
    db.interacoes = db.interacoes.filter((i) => db.posts.some((p) => p.id === i.id_post));
    mockDb.salvar(db);
    return { ok: true };
  },

  /** Curtir de novo = descurtir (toggle). */
  async curtir(idPost) {
    if (!USE_MOCK) return http(`/posts/${idPost}/curtir`, { method: 'POST' });
    const db = mockDb.ler();
    const meuId = eu();
    const existente = db.interacoes.find((i) => i.id_post === idPost && i.id_usuario === meuId && i.tipo === 'curtir');
    if (existente) db.interacoes = db.interacoes.filter((i) => i !== existente);
    else db.interacoes.push({ id: mockDb.proximoId(db.interacoes), id_usuario: meuId, id_post: idPost, tipo: 'curtir', data_interacao: new Date().toISOString() });
    mockDb.salvar(db);
    return enriquecerPost(db, meuId, db.posts.find((p) => p.id === idPost));
  },

  async comentar(idPost, texto) {
    if (!USE_MOCK) return http(`/posts/${idPost}/comentarios`, { method: 'POST', body: { texto } });
    await atraso(200);
    const db = mockDb.ler();
    const meuId = eu();
    db.interacoes.push({
      id: mockDb.proximoId(db.interacoes),
      id_usuario: meuId,
      id_post: idPost,
      tipo: 'comentar',
      comentario_texto: texto.trim(),
      data_interacao: new Date().toISOString(),
    });
    mockDb.salvar(db);
    return enriquecerPost(db, meuId, db.posts.find((p) => p.id === idPost));
  },

  // ================= GRUPOS (RF073–RF076) =================
  async grupos() {
    if (!USE_MOCK) return http('/grupos');
    await atraso();
    const db = mockDb.ler();
    const meuId = eu();
    return db.grupos.map((g) => {
      const membros = db.membros_grupo.filter((m) => m.id_grupo === g.id);
      return { ...g, total_membros: membros.length, sou_membro: membros.some((m) => m.id_usuario === meuId) };
    });
  },

  async grupo(id) {
    if (!USE_MOCK) return http(`/grupos/${id}`);
    await atraso();
    const db = mockDb.ler();
    const meuId = eu();
    const g = db.grupos.find((x) => x.id === Number(id));
    if (!g) throw new ApiError(traduzir('erros.grupo404'), 404);
    const usuario = (uid) => resumo(db.usuarios.find((u) => u.id === uid));
    const membros = db.membros_grupo.filter((m) => m.id_grupo === g.id);
    const minha = membros.find((m) => m.id_usuario === meuId);
    return {
      ...g,
      sou_membro: Boolean(minha),
      minha_funcao: minha?.funcao || null,
      membros: membros.map((m) => ({ ...usuario(m.id_usuario), funcao: m.funcao })),
      posts: db.posts_grupo
        .filter((p) => p.id_grupo === g.id)
        .sort(maisRecentes)
        .map((p) => ({ ...p, autor: usuario(p.id_usuario) })),
    };
  },

  async criarGrupo({ nome, descricao, categoria, cor }) {
    if (!USE_MOCK) return http('/grupos', { method: 'POST', body: { nome, descricao, categoria, cor } });
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    if (db.grupos.some((g) => g.nome.toLowerCase() === nome.trim().toLowerCase())) throw new ApiError(traduzir('erros.grupoExiste'), 409);
    const grupo = { id: mockDb.proximoId(db.grupos), nome: nome.trim(), descricao: descricao.trim(), categoria, cor, id_criador: meuId, tipo: 'publico', data_criacao: new Date().toISOString() };
    db.grupos.push(grupo);
    db.membros_grupo.push({ id_grupo: grupo.id, id_usuario: meuId, funcao: 'admin' });
    mockDb.salvar(db);
    return grupo;
  },

  async entrarNoGrupo(id) {
    if (!USE_MOCK) return http(`/grupos/${id}/membros`, { method: 'POST' });
    await atraso(200);
    const db = mockDb.ler();
    const meuId = eu();
    if (!db.membros_grupo.some((m) => m.id_grupo === Number(id) && m.id_usuario === meuId)) {
      db.membros_grupo.push({ id_grupo: Number(id), id_usuario: meuId, funcao: 'membro' });
      mockDb.salvar(db);
    }
    return { ok: true };
  },

  async sairDoGrupo(id) {
    if (!USE_MOCK) return http(`/grupos/${id}/membros`, { method: 'DELETE' });
    await atraso(200);
    const db = mockDb.ler();
    const meuId = eu();
    const membros = db.membros_grupo.filter((m) => m.id_grupo === Number(id));
    const eu_ = membros.find((m) => m.id_usuario === meuId);
    // O último admin não pode sair e deixar o grupo sem dono
    if (eu_?.funcao === 'admin' && membros.filter((m) => m.funcao === 'admin').length === 1 && membros.length > 1) {
      throw new ApiError(traduzir('erros.unicoAdmin'), 409);
    }
    db.membros_grupo = db.membros_grupo.filter((m) => !(m.id_grupo === Number(id) && m.id_usuario === meuId));
    mockDb.salvar(db);
    return { ok: true };
  },

  async postarNoGrupo(id, { titulo, conteudo }) {
    if (!USE_MOCK) return http(`/grupos/${id}/posts`, { method: 'POST', body: { titulo, conteudo } });
    await atraso(250);
    const db = mockDb.ler();
    const meuId = eu();
    if (!db.membros_grupo.some((m) => m.id_grupo === Number(id) && m.id_usuario === meuId)) throw new ApiError(traduzir('erros.entreNoGrupo'), 403);
    const post = { id: mockDb.proximoId(db.posts_grupo), id_grupo: Number(id), id_usuario: meuId, titulo: titulo.trim(), conteudo: conteudo.trim(), data_publicacao: new Date().toISOString() };
    db.posts_grupo.push(post);
    mockDb.salvar(db);
    return post;
  },
};
