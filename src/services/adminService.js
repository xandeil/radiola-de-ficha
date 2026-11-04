import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';
import { registrarAuditoria } from './auditoria';
import { planosMock } from '@/mocks/assinatura';

/*
 * Serviços do PAINEL ADMINISTRATIVO (seções 7, 9 e 10).
 *
 * No mock, cada função confere a permissão antes de agir — exatamente o que
 * o AdminMiddleware.php precisa fazer no servidor. Se você esquecer essa
 * checagem no PHP, qualquer usuário que descobrir a URL vira admin.
 */

const DIA = 86400000;
const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

function permissoesDe(db, idUsuario) {
  const papeis = db.usuarios_papeis.filter((r) => r.id_usuario === idUsuario).map((r) => db.papeis.find((p) => p.id === r.id_papel));
  return { permissoes: papeis.flatMap((p) => p?.permissoes || []), nivel: Math.max(10, ...papeis.map((p) => p?.nivel || 10)), papeis };
}

/** Lança 403 se o usuário logado não tiver a permissão. */
function exigir(db, permissao) {
  const { permissoes } = permissoesDe(db, eu());
  const [recurso] = permissao.split('.');
  if (!(permissoes.includes('*') || permissoes.includes(permissao) || permissoes.includes(`${recurso}.*`))) {
    throw new ApiError('Você não tem permissão para isto', 403);
  }
}

const resumo = (u) => (u ? { id: u.id, nome: u.nome, email: u.email, apelido: u.apelido } : null);
const planoDoCodigo = (codigo) => planosMock.find((p) => p.codigo === codigo) || planosMock[0];

// ---------- Segmentos do CRM (seção 9.3) ----------
const SEGMENTOS = {
  novos: { nome: 'Novos usuários', regra: 'Cadastro há menos de 7 dias', filtro: (u) => Date.now() - new Date(u.data_cadastro || 0) < 7 * DIA },
  inativos: { nome: 'Inativos', regra: 'Sem login há mais de 30 dias', filtro: (u) => Date.now() - new Date(u.ultimo_login || u.data_cadastro || 0) > 30 * DIA },
  limite: { nome: 'Perto do limite', regra: 'Gratuito com mais de 80% do limite de itens', filtro: (u, ctx) => u.plano === 'gratuito' && ctx.itens(u.id) >= 40 },
  risco: { nome: 'Risco de churn', regra: 'Assinatura cancelada ou teste terminando em 2 dias', filtro: (u, ctx) => ctx.risco(u.id) },
  power: { nome: 'Power users', regra: 'Mais de 100 itens catalogados', filtro: (u, ctx) => ctx.itens(u.id) > 100 },
};

function contextoCrm(db) {
  const contagem = {};
  db.itens.forEach((i) => (contagem[i.id_usuario] = (contagem[i.id_usuario] || 0) + 1));
  return {
    itens: (id) => contagem[id] || 0,
    risco: (id) =>
      db.assinaturas.some(
        (a) => a.id_usuario === id && (a.status === 'cancelada' || (a.status === 'trial' && new Date(`${a.trial_ends}T23:59:59`) - Date.now() < 2 * DIA)),
      ),
  };
}

const clientes = (db) => db.usuarios.filter((u) => !u.equipe);

export const adminService = {
  // ================= DASHBOARD =================
  async dashboard() {
    if (!USE_MOCK) return http('/admin/dashboard');
    await atraso(300);
    const db = mockDb.ler();
    exigir(db, 'dashboard.ver');

    const usuarios = clientes(db);
    const hoje = Date.now();
    const ativos30 = usuarios.filter((u) => hoje - new Date(u.ultimo_login || 0) < 30 * DIA).length;

    // Assinantes por plano e MRR (receita recorrente mensal: planos anuais contam valor/12)
    const porPlano = planosMock.map((p) => ({ codigo: p.codigo, nome: p.nome, total: usuarios.filter((u) => (u.plano || 'gratuito') === p.codigo).length }));
    const mrr = usuarios.reduce((soma, u) => {
      const p = planoDoCodigo(u.plano);
      return soma + (p.preco_mensal || (p.preco_anual ? p.preco_anual / 12 : 0));
    }, 0);
    const pagantes = usuarios.filter((u) => u.plano && u.plano !== 'gratuito').length;
    const cancelamentos30 = db.motivos_cancelamento.filter((m) => !m.aceitou_oferta_retencao && hoje - new Date(m.data_cancelamento) < 30 * DIA).length;

    // Cadastros dos últimos 14 dias (para o gráfico de barras)
    const cadastros = Array.from({ length: 14 }, (_, i) => {
      const dia = new Date(hoje - (13 - i) * DIA).toISOString().slice(0, 10);
      return { dia, total: usuarios.filter((u) => (u.data_cadastro || '').slice(0, 10) === dia).length };
    });

    const impressoes = db.impressoes_propaganda.length;
    const cliques = db.cliques_propaganda.length;
    const csat = db.pesquisas_satisfacao.filter((p) => p.tipo === 'csat');

    return {
      totalUsuarios: usuarios.length,
      ativos30,
      pagantes,
      mrr,
      churn30: pagantes ? cancelamentos30 / (pagantes + cancelamentos30) : 0,
      itens: db.itens.length,
      porPlano,
      cadastros,
      ticketsAbertos: db.tickets_suporte.filter((t) => ['aberto', 'aguardando_usuario', 'respondido'].includes(t.status)).length,
      ticketsSemAgente: db.tickets_suporte.filter((t) => t.status === 'aberto' && !t.id_agente).length,
      csat: csat.length ? csat.reduce((s, p) => s + p.nota, 0) / csat.length : null,
      impressoes,
      cliques,
      ctr: impressoes ? cliques / impressoes : 0,
      ultimoBackup: [...db.backups_registros].sort((a, b) => b.data_inicio.localeCompare(a.data_inicio))[0] || null,
      manutencao: db.configuracoes_manutencao.ativo,
    };
  },

  // ================= USUÁRIOS (seção 9.2 e 10.1) =================
  async usuarios(busca = '') {
    if (!USE_MOCK) return http(`/admin/usuarios?busca=${encodeURIComponent(busca)}`);
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'usuarios.ver');
    const t = busca.trim().toLowerCase();
    return db.usuarios
      .filter((u) => !t || u.nome.toLowerCase().includes(t) || u.email.includes(t) || (u.apelido || '').includes(t))
      .map((u) => ({
        ...resumo(u),
        plano: u.plano || 'gratuito',
        ativo: u.ativo !== false,
        equipe: Boolean(u.equipe),
        papeis: permissoesDe(db, u.id).papeis.map((p) => p.rotulo),
        itens: db.itens.filter((i) => i.id_usuario === u.id).length,
        ultimo_login: u.ultimo_login,
        data_cadastro: u.data_cadastro,
      }));
  },

  /** Perfil 360°: tudo sobre o cliente numa tela só (seção 9.2). */
  async usuario360(id) {
    if (!USE_MOCK) return http(`/admin/usuarios/${id}`);
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'usuarios.ver');
    const u = db.usuarios.find((x) => x.id === Number(id));
    if (!u) throw new ApiError('Usuário não encontrado', 404);
    const itens = db.itens.filter((i) => i.id_usuario === u.id);
    const porTipo = {};
    itens.forEach((i) => (porTipo[i.tipo_midia] = (porTipo[i.tipo_midia] || 0) + 1));
    const { papeis } = permissoesDe(db, u.id);
    return {
      usuario: { ...resumo(u), bio: u.bio, plano: u.plano || 'gratuito', ativo: u.ativo !== false, data_cadastro: u.data_cadastro, ultimo_login: u.ultimo_login, equipe: Boolean(u.equipe) },
      papeis: papeis.map((p) => p.nome),
      papeisDisponiveis: db.papeis.map(({ id: idPapel, nome, rotulo, nivel }) => ({ id: idPapel, nome, rotulo, nivel })),
      meuNivel: permissoesDe(db, eu()).nivel,
      colecao: { total: itens.length, porTipo, publicos: itens.filter((i) => i.publico).length },
      social: {
        amigos: db.amizades.filter((a) => a.status === 'ativa' && (a.id_usuario_1 === u.id || a.id_usuario_2 === u.id)).length,
        posts: db.posts.filter((p) => p.id_usuario === u.id).length,
      },
      assinaturas: db.assinaturas.filter((a) => a.id_usuario === u.id).sort((a, b) => b.id - a.id),
      transacoes: db.transacoes.filter((t) => t.id_usuario === u.id).sort((a, b) => b.id - a.id),
      tickets: db.tickets_suporte.filter((t) => t.id_usuario === u.id).sort((a, b) => b.id - a.id),
      segmentos: Object.entries(SEGMENTOS).filter(([, s]) => s.filtro(u, contextoCrm(db))).map(([chave, s]) => ({ chave, nome: s.nome })),
    };
  },

  async alterarStatusUsuario(id, ativo, motivo) {
    if (!USE_MOCK) return http(`/admin/usuarios/${id}/status`, { method: 'PATCH', body: { ativo, motivo } });
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'usuarios.editar');
    if (Number(id) === eu()) throw new ApiError('Você não pode suspender a própria conta', 409);
    const u = db.usuarios.find((x) => x.id === Number(id));
    if (permissoesDe(db, u.id).nivel >= permissoesDe(db, eu()).nivel) throw new ApiError('Você não pode alterar alguém do mesmo nível ou acima', 403);
    const antes = { ativo: u.ativo !== false };
    u.ativo = ativo;
    registrarAuditoria(db, { acao: ativo ? 'usuario.reativar' : 'usuario.suspender', tipo_recurso: 'usuario', recurso_id: u.id, dados_antes: antes, dados_depois: { ativo }, observacao: motivo });
    mockDb.salvar(db);
    return { ok: true };
  },

  /** Só quem tem nível MAIOR que o papel pode atribuí-lo (ninguém se promove a superadmin sozinho). */
  async definirPapel(id, nomePapel) {
    if (!USE_MOCK) return http(`/admin/usuarios/${id}/papel`, { method: 'PUT', body: { papel: nomePapel } });
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'usuarios.editar');
    const papel = db.papeis.find((p) => p.nome === nomePapel);
    const meu = permissoesDe(db, eu()).nivel;
    if (papel.nivel >= meu && meu < 100) throw new ApiError('Você só pode atribuir papéis abaixo do seu nível', 403);
    if (Number(id) === eu()) throw new ApiError('Peça para outro administrador mudar o seu papel', 409);
    const antes = permissoesDe(db, Number(id)).papeis.map((p) => p.nome);
    db.usuarios_papeis = db.usuarios_papeis.filter((r) => r.id_usuario !== Number(id));
    if (papel.nome !== 'usuario') db.usuarios_papeis.push({ id_usuario: Number(id), id_papel: papel.id, atribuido_por: eu(), data_atribuicao: new Date().toISOString() });
    const u = db.usuarios.find((x) => x.id === Number(id));
    u.equipe = papel.nome !== 'usuario';
    registrarAuditoria(db, { acao: 'usuario.papel', tipo_recurso: 'usuario', recurso_id: Number(id), dados_antes: { papeis: antes }, dados_depois: { papeis: [papel.nome] } });
    mockDb.salvar(db);
    return { ok: true };
  },

  // ================= TICKETS (seção 9.5) =================
  async tickets({ status = '', prioridade = '', meus = false } = {}) {
    if (!USE_MOCK) return http(`/admin/tickets?${new URLSearchParams({ status, prioridade, meus })}`);
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'tickets.ver');
    const peso = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    return db.tickets_suporte
      .filter((t) => (!status || t.status === status) && (!prioridade || t.prioridade === prioridade) && (!meus || t.id_agente === eu()))
      .map((t) => ({ ...t, usuario: resumo(db.usuarios.find((u) => u.id === t.id_usuario)), agente: resumo(db.usuarios.find((u) => u.id === t.id_agente)), respostas: db.tickets_respostas.filter((r) => r.id_ticket === t.id).length }))
      // Fila: primeiro os não resolvidos, depois por prioridade, depois os mais antigos (quem espera há mais tempo)
      .sort((a, b) => Number(['resolvido', 'fechado'].includes(a.status)) - Number(['resolvido', 'fechado'].includes(b.status)) || peso[a.prioridade] - peso[b.prioridade] || a.data_abertura.localeCompare(b.data_abertura));
  },

  async ticket(id) {
    if (!USE_MOCK) return http(`/admin/tickets/${id}`);
    await atraso(200);
    const db = mockDb.ler();
    exigir(db, 'tickets.ver');
    const t = db.tickets_suporte.find((x) => x.id === Number(id));
    if (!t) throw new ApiError('Ticket não encontrado', 404);
    const u = db.usuarios.find((x) => x.id === t.id_usuario);
    return {
      ...t,
      usuario: { ...resumo(u), plano: u?.plano },
      agente: resumo(db.usuarios.find((x) => x.id === t.id_agente)),
      mensagens: [
        { id: 0, equipe: false, nome: u?.nome, mensagem: t.descricao, data: t.data_abertura, anexos: t.anexos || [] },
        ...db.tickets_respostas
          .filter((r) => r.id_ticket === t.id)
          .map((r) => ({ id: r.id, equipe: r.id_usuario !== t.id_usuario, interna: Boolean(r.interna), nome: db.usuarios.find((x) => x.id === r.id_usuario)?.nome, mensagem: r.mensagem, data: r.data_resposta, anexos: r.anexos || [] })),
      ],
      avaliacao: db.pesquisas_satisfacao.find((p) => p.id_ticket === t.id) || null,
    };
  },

  /** Resposta da equipe. interna = nota só para a equipe (o cliente não vê). */
  async responderTicket(id, { mensagem, interna = false, novoStatus }) {
    if (!USE_MOCK) return http(`/admin/tickets/${id}/respostas`, { method: 'POST', body: { mensagem, interna, novoStatus } });
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'tickets.responder');
    const t = db.tickets_suporte.find((x) => x.id === Number(id));
    db.tickets_respostas.push({ id: mockDb.proximoId(db.tickets_respostas), id_ticket: t.id, id_usuario: eu(), mensagem: mensagem.trim(), interna, data_resposta: new Date().toISOString() });
    if (!t.id_agente) t.id_agente = eu(); // quem responde primeiro assume o ticket
    if (!interna) t.status = novoStatus || 'respondido';
    else if (novoStatus) t.status = novoStatus;
    if (t.status === 'resolvido') t.data_resolucao = new Date().toISOString();
    t.data_atualizacao = new Date().toISOString();
    mockDb.salvar(db);
    return t;
  },

  async atualizarTicket(id, { prioridade, status, assumir }) {
    if (!USE_MOCK) return http(`/admin/tickets/${id}`, { method: 'PATCH', body: { prioridade, status, assumir } });
    await atraso(200);
    const db = mockDb.ler();
    exigir(db, 'tickets.responder');
    const t = db.tickets_suporte.find((x) => x.id === Number(id));
    const antes = { prioridade: t.prioridade, status: t.status, id_agente: t.id_agente };
    if (prioridade) t.prioridade = prioridade;
    if (status) t.status = status;
    if (assumir) t.id_agente = eu();
    t.data_atualizacao = new Date().toISOString();
    registrarAuditoria(db, { acao: 'ticket.atualizar', tipo_recurso: 'ticket', recurso_id: t.id, dados_antes: antes, dados_depois: { prioridade: t.prioridade, status: t.status, id_agente: t.id_agente } });
    mockDb.salvar(db);
    return t;
  },

  // ================= CRM (seção 9.3 e 9.4) =================
  async crm() {
    if (!USE_MOCK) return http('/admin/crm');
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'crm.ver');
    const ctx = contextoCrm(db);
    const lista = clientes(db);
    return {
      segmentos: Object.entries(SEGMENTOS).map(([chave, s]) => ({
        chave,
        nome: s.nome,
        regra: s.regra,
        usuarios: lista.filter((u) => s.filtro(u, ctx)).map(resumo),
      })),
      automacoes: db.automacoes,
      emails: [...db.emails_enviados].sort((a, b) => b.id - a.id).slice(0, 50),
    };
  },

  async alternarAutomacao(id) {
    if (!USE_MOCK) return http(`/admin/crm/automacoes/${id}`, { method: 'PATCH' });
    const db = mockDb.ler();
    exigir(db, 'crm.executar');
    const a = db.automacoes.find((x) => x.id === id);
    a.ativa = !a.ativa;
    registrarAuditoria(db, { acao: a.ativa ? 'automacao.ativar' : 'automacao.pausar', tipo_recurso: 'automacao', recurso_id: id });
    mockDb.salvar(db);
    return a;
  },

  /**
   * Roda a automação AGORA (no servidor real, isso é um cron diário — veja /src/CLI/send-emails.php no documento).
   * Não reenvia para quem já recebeu a mesma automação nos últimos 7 dias: e-mail repetido vira spam.
   */
  async executarAutomacao(id) {
    if (!USE_MOCK) return http(`/admin/crm/automacoes/${id}/executar`, { method: 'POST' });
    await atraso(600);
    const db = mockDb.ler();
    exigir(db, 'crm.executar');
    const a = db.automacoes.find((x) => x.id === id);
    if (!a.ativa) throw new ApiError('Ative a automação antes de executar', 409);
    const ctx = contextoCrm(db);
    const publico = clientes(db).filter((u) => u.ativo !== false && SEGMENTOS[a.segmento].filtro(u, ctx));
    const recentes = new Set(db.emails_enviados.filter((e) => e.automacao === id && Date.now() - new Date(e.data) < 7 * DIA).map((e) => e.id_usuario));
    const novos = publico.filter((u) => !recentes.has(u.id));
    novos.forEach((u) =>
      db.emails_enviados.push({ id: mockDb.proximoId(db.emails_enviados), automacao: id, id_usuario: u.id, para: u.email, assunto: a.assunto, data: new Date().toISOString(), status: 'enviado' }),
    );
    a.ultima_execucao = new Date().toISOString();
    registrarAuditoria(db, { acao: 'automacao.executar', tipo_recurso: 'automacao', recurso_id: id, dados_depois: { enviados: novos.length, ignorados: publico.length - novos.length } });
    mockDb.salvar(db);
    return { enviados: novos.length, ignorados: publico.length - novos.length };
  },

  // ================= FINANCEIRO =================
  async financeiro() {
    if (!USE_MOCK) return http('/admin/financeiro');
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'assinaturas.ver');
    const usuario = (id) => resumo(db.usuarios.find((u) => u.id === id));
    const aprovadas = db.transacoes.filter((t) => t.status === 'aprovada');
    return {
      receitaTotal: aprovadas.reduce((s, t) => s + t.valor, 0),
      reembolsado: db.transacoes.filter((t) => t.status === 'reembolsada').reduce((s, t) => s + t.valor, 0),
      pendentes: db.transacoes.filter((t) => t.status === 'pendente').length,
      transacoes: [...db.transacoes].sort((a, b) => b.id - a.id).map((t) => ({ ...t, usuario: usuario(t.id_usuario) })),
      motivosCancelamento: db.motivos_cancelamento,
    };
  },

  /** Reembolso: volta o dinheiro E encerra o acesso pago daquela compra. */
  async reembolsar(idTransacao, motivo) {
    if (!USE_MOCK) return http(`/admin/transacoes/${idTransacao}/reembolso`, { method: 'POST', body: { motivo } });
    await atraso(500);
    const db = mockDb.ler();
    exigir(db, 'assinaturas.reembolsar');
    const t = db.transacoes.find((x) => x.id === Number(idTransacao));
    if (t.status !== 'aprovada') throw new ApiError('Só pagamentos aprovados podem ser reembolsados', 409);
    t.status = 'reembolsada';
    const a = db.assinaturas.find((x) => x.id === t.id_assinatura);
    if (a && ['ativa', 'cancelada'].includes(a.status)) {
      a.status = 'expirada';
      a.data_expiracao = new Date(Date.now() - DIA).toISOString().slice(0, 10);
      const u = db.usuarios.find((x) => x.id === t.id_usuario);
      u.plano = 'gratuito';
    }
    registrarAuditoria(db, { acao: 'transacao.reembolsar', tipo_recurso: 'transacao', recurso_id: t.id, dados_antes: { status: 'aprovada' }, dados_depois: { status: 'reembolsada' }, observacao: motivo });
    mockDb.salvar(db);
    return t;
  },

  // ================= BACKUP (seção 7) =================
  async backups() {
    if (!USE_MOCK) return http('/admin/backups');
    await atraso(250);
    const db = mockDb.ler();
    exigir(db, 'backup.ver');
    const usuario = (id) => resumo(db.usuarios.find((u) => u.id === id));
    return {
      backups: [...db.backups_registros].sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)),
      solicitacoes: [...db.restauracoes_solicitacoes].sort((a, b) => b.id - a.id).map((s) => ({ ...s, usuario: usuario(s.id_usuario), backup: db.backups_registros.find((b) => b.id === s.id_backup) })),
    };
  },

  /**
   * Executa um backup completo, passo a passo como no script da seção 7.4.
   * "aoPasso" recebe o progresso para a tela mostrar cada etapa.
   * No mock, o "arquivo" é uma cópia do banco guardada no localStorage,
   * o que permite testar a restauração de verdade.
   */
  async executarBackup(aoPasso = () => {}) {
    if (!USE_MOCK) return http('/admin/backups', { method: 'POST' });
    const db = mockDb.ler();
    exigir(db, 'backup.executar');
    const passos = [
      'Iniciando transação',
      'Gerando dump do banco (mysqldump --single-transaction)',
      'Compactando (gzip)',
      'Criptografando (AES-256)',
      'Calculando checksum (SHA-256)',
      'Enviando para o storage na nuvem',
      'Registrando em backups_registros',
      'Limpando backups expirados',
    ];
    const inicio = new Date().toISOString();
    const { backups_registros, ...semBackups } = db;
    const conteudo = JSON.stringify(semBackups);

    for (let i = 0; i < passos.length; i++) {
      aoPasso({ passo: i + 1, total: passos.length, descricao: passos[i] });
      await atraso(350);
    }

    // Checksum de verdade, com a Web Crypto API do navegador
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conteudo));
    const checksum = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');

    const atual = mockDb.ler();
    const registro = {
      id: mockDb.proximoId(atual.backups_registros),
      tipo_backup: 'completo',
      data_inicio: inicio,
      data_fim: new Date().toISOString(),
      tamanho_bytes: new Blob([conteudo]).size,
      arquivo_nome: `radiola_${inicio.slice(0, 19).replace(/[:T]/g, '-')}.sql.gz.enc`,
      checksum,
      destino: 'nuvem',
      status: 'sucesso',
      manual: true,
      data_expiracao: new Date(Date.now() + 30 * DIA).toISOString().slice(0, 10),
    };
    try {
      // Guarda só os 3 últimos "arquivos" para não estourar o localStorage
      localStorage.setItem(`radiola.backup.${registro.id}`, conteudo);
      Object.keys(localStorage)
        .filter((k) => k.startsWith('radiola.backup.'))
        .sort((a, b) => Number(b.split('.').pop()) - Number(a.split('.').pop()))
        .slice(3)
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      registro.observacao = 'Snapshot não guardado (armazenamento cheio)';
    }
    atual.backups_registros.push(registro);
    registrarAuditoria(atual, { acao: 'backup.executar', tipo_recurso: 'backup', recurso_id: registro.id });
    mockDb.salvar(atual);
    return registro;
  },

  /** Autoteste (seção 7.5): restaura num "ambiente isolado" e confere o checksum. */
  async testarBackup(id) {
    if (!USE_MOCK) return http(`/admin/backups/${id}/teste`, { method: 'POST' });
    await atraso(700);
    const db = mockDb.ler();
    exigir(db, 'backup.ver');
    const b = db.backups_registros.find((x) => x.id === id);
    const conteudo = localStorage.getItem(`radiola.backup.${id}`);
    if (!conteudo) return { ok: b.status === 'sucesso', simulado: true, mensagem: 'Arquivo de exemplo: integridade simulada.' };
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conteudo));
    const checksum = [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
    const ok = checksum === b.checksum;
    JSON.parse(conteudo); // "restaurar" no ambiente isolado = conseguir ler tudo
    return { ok, simulado: false, mensagem: ok ? 'Checksum confere e o arquivo foi lido por inteiro.' : 'Checksum NÃO confere: arquivo corrompido!' };
  },

  /** Executa uma solicitação de restauração de usuário (granular: só os itens dele). */
  async executarRestauracao(idSolicitacao) {
    if (!USE_MOCK) return http(`/admin/restauracoes/${idSolicitacao}/executar`, { method: 'POST' });
    await atraso(700);
    const db = mockDb.ler();
    exigir(db, 'backup.executar');
    const s = db.restauracoes_solicitacoes.find((x) => x.id === Number(idSolicitacao));
    if (s.status !== 'pendente') throw new ApiError('Esta solicitação já foi tratada', 409);
    const conteudo = localStorage.getItem(`radiola.backup.${s.id_backup}`);
    let observacao;
    if (conteudo) {
      const copia = JSON.parse(conteudo);
      const itensDoBackup = copia.itens.filter((i) => i.id_usuario === s.id_usuario);
      db.itens = [...db.itens.filter((i) => i.id_usuario !== s.id_usuario), ...itensDoBackup];
      observacao = `${itensDoBackup.length} itens restaurados.`;
    } else {
      observacao = 'Backup de exemplo (sem arquivo no mock): restauração simulada.';
    }
    Object.assign(s, { status: 'concluida', data_execucao: new Date().toISOString(), id_admin_responsavel: eu(), resultado: observacao });
    registrarAuditoria(db, { acao: 'backup.restaurar', tipo_recurso: 'restauracao', recurso_id: s.id, observacao });
    mockDb.salvar(db);
    return s;
  },

  // ================= LOGS =================
  async logs({ acao = '' } = {}) {
    if (!USE_MOCK) return http(`/admin/logs?acao=${encodeURIComponent(acao)}`);
    await atraso(200);
    const db = mockDb.ler();
    exigir(db, 'logs.ver');
    return [...db.logs_auditoria]
      .filter((l) => !acao || l.acao.startsWith(acao))
      .sort((a, b) => b.id - a.id)
      .slice(0, 200)
      .map((l) => ({ ...l, usuario: resumo(db.usuarios.find((u) => u.id === l.id_usuario)) }));
  },
};
