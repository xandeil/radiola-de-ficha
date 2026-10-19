import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';

/*
 * Central de suporte do USUÁRIO (seção 9.5): base de conhecimento,
 * tickets e pesquisa de satisfação (CSAT).
 * O lado da equipe (fila, atribuição) fica em adminService.
 */

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

export const CATEGORIAS_TICKET = [
  { valor: 'duvida', rotulo: 'Dúvida' },
  { valor: 'problema_tecnico', rotulo: 'Problema técnico' },
  { valor: 'financeiro', rotulo: 'Pagamento e assinatura' },
  { valor: 'sugestao', rotulo: 'Sugestão' },
  { valor: 'denuncia', rotulo: 'Denúncia' },
];

export const STATUS_TICKET = {
  aberto: 'Aberto',
  respondido: 'Respondido',
  aguardando_usuario: 'Aguardando você',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

/**
 * Prioridade automática: financeiro e denúncia sobem; assinante Premium
 * sobe um nível (o documento promete resposta em 48h no Premium, RF047).
 */
function prioridadeInicial(categoria, plano) {
  const ordem = ['baixa', 'media', 'alta', 'urgente'];
  let i = { financeiro: 2, denuncia: 2, problema_tecnico: 1, duvida: 1, sugestao: 0 }[categoria] ?? 1;
  if (plano && plano !== 'gratuito') i = Math.min(3, i + 1);
  return ordem[i];
}

const normalizar = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const suporteService = {
  // ---------- base de conhecimento ----------
  async artigos(busca = '') {
    if (!USE_MOCK) return http(`/ajuda/artigos?busca=${encodeURIComponent(busca)}`);
    await atraso(150);
    const termo = normalizar(busca.trim());
    const todos = mockDb.ler().artigos_ajuda;
    if (!termo) return [...todos].sort((a, b) => b.views - a.views);
    // Busca simples por relevância: título vale mais que tags, que valem mais que conteúdo
    return todos
      .map((a) => ({
        a,
        pontos:
          (normalizar(a.titulo).includes(termo) ? 3 : 0) +
          (a.tags.some((t) => normalizar(t).includes(termo)) ? 2 : 0) +
          (normalizar(a.conteudo).includes(termo) ? 1 : 0),
      }))
      .filter((x) => x.pontos > 0)
      .sort((x, y) => y.pontos - x.pontos)
      .map((x) => x.a);
  },

  async artigo(slug) {
    if (!USE_MOCK) return http(`/ajuda/artigos/${slug}`);
    await atraso(150);
    const db = mockDb.ler();
    const artigo = db.artigos_ajuda.find((a) => a.slug === slug);
    if (!artigo) throw new ApiError('Artigo não encontrado', 404);
    artigo.views++;
    mockDb.salvar(db);
    return artigo;
  },

  async votarArtigo(id, util) {
    if (!USE_MOCK) return http(`/ajuda/artigos/${id}/voto`, { method: 'POST', body: { util } });
    const db = mockDb.ler();
    const artigo = db.artigos_ajuda.find((a) => a.id === id);
    if (util) artigo.util_sim++;
    else artigo.util_nao++;
    mockDb.salvar(db);
    return artigo;
  },

  // ---------- tickets ----------
  async meusTickets() {
    if (!USE_MOCK) return http('/tickets');
    await atraso();
    return mockDb
      .ler()
      .tickets_suporte.filter((t) => t.id_usuario === eu())
      .sort((a, b) => b.data_atualizacao.localeCompare(a.data_atualizacao));
  },

  async ticket(id) {
    if (!USE_MOCK) return http(`/tickets/${id}`);
    await atraso(200);
    const db = mockDb.ler();
    const t = db.tickets_suporte.find((x) => x.id === Number(id) && x.id_usuario === eu());
    if (!t) throw new ApiError('Ticket não encontrado', 404);
    const nome = (uid) => db.usuarios.find((u) => u.id === uid)?.nome || 'Equipe Radiola';
    return {
      ...t,
      mensagens: [
        { id: 0, autor: 'voce', nome: 'Você', mensagem: t.descricao, data: t.data_abertura, anexos: t.anexos || [] },
        ...db.tickets_respostas
          .filter((r) => r.id_ticket === t.id && !r.interna) // nota interna da equipe nunca vai para o usuário
          .map((r) => ({ id: r.id, autor: r.id_usuario === eu() ? 'voce' : 'equipe', nome: r.id_usuario === eu() ? 'Você' : nome(r.id_usuario), mensagem: r.mensagem, data: r.data_resposta, anexos: r.anexos || [] })),
      ],
      avaliacao: db.pesquisas_satisfacao.find((p) => p.id_ticket === t.id) || null,
    };
  },

  async abrirTicket({ categoria, assunto, descricao, anexos = [] }) {
    if (!USE_MOCK) return http('/tickets', { method: 'POST', body: { categoria, assunto, descricao, anexos } });
    await atraso(400);
    const db = mockDb.ler();
    const meuId = eu();
    const usuario = db.usuarios.find((u) => u.id === meuId);
    const agora = new Date().toISOString();
    const ticket = {
      id: mockDb.proximoId(db.tickets_suporte),
      id_usuario: meuId,
      categoria,
      assunto: assunto.trim(),
      descricao: descricao.trim(),
      prioridade: prioridadeInicial(categoria, usuario?.plano),
      status: 'aberto',
      data_abertura: agora,
      data_atualizacao: agora,
      id_agente: null,
      anexos,
    };
    db.tickets_suporte.push(ticket);
    mockDb.salvar(db);
    return ticket;
  },

  async responder(id, mensagem, anexos = []) {
    if (!USE_MOCK) return http(`/tickets/${id}/respostas`, { method: 'POST', body: { mensagem, anexos } });
    await atraso(250);
    const db = mockDb.ler();
    const t = db.tickets_suporte.find((x) => x.id === Number(id) && x.id_usuario === eu());
    if (!t) throw new ApiError('Ticket não encontrado', 404);
    if (t.status === 'fechado') throw new ApiError('Este ticket foi fechado. Abra um novo, se precisar.', 409);
    db.tickets_respostas.push({ id: mockDb.proximoId(db.tickets_respostas), id_ticket: t.id, id_usuario: eu(), mensagem: mensagem.trim(), anexos, data_resposta: new Date().toISOString() });
    t.status = 'aberto'; // a bola volta para a equipe
    t.data_atualizacao = new Date().toISOString();
    mockDb.salvar(db);
    return t;
  },

  async marcarResolvido(id) {
    if (!USE_MOCK) return http(`/tickets/${id}/resolver`, { method: 'POST' });
    await atraso(200);
    const db = mockDb.ler();
    const t = db.tickets_suporte.find((x) => x.id === Number(id) && x.id_usuario === eu());
    t.status = 'resolvido';
    t.data_resolucao = new Date().toISOString();
    t.data_atualizacao = t.data_resolucao;
    mockDb.salvar(db);
    return t;
  },

  /** CSAT: nota de 1 a 5 depois da resolução. */
  async avaliar(id, nota, comentario) {
    if (!USE_MOCK) return http(`/tickets/${id}/avaliacao`, { method: 'POST', body: { nota, comentario } });
    await atraso(200);
    const db = mockDb.ler();
    if (db.pesquisas_satisfacao.some((p) => p.id_ticket === Number(id))) throw new ApiError('Você já avaliou este atendimento', 409);
    db.pesquisas_satisfacao.push({ id: mockDb.proximoId(db.pesquisas_satisfacao), id_usuario: eu(), tipo: 'csat', id_ticket: Number(id), nota, comentario, data_resposta: new Date().toISOString() });
    const t = db.tickets_suporte.find((x) => x.id === Number(id));
    t.status = 'fechado';
    mockDb.salvar(db);
    return { ok: true };
  },
};
