import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';
import { registrarAuditoria } from './auditoria';

/*
 * Modo manutenção (Anexo 2, seção 16).
 *
 * status() é PÚBLICO (RF106: GET /api/status) e precisa ser rapidíssimo,
 * porque roda antes de qualquer tela. Por isso guardamos a resposta em
 * memória por 60 segundos (RNF045: "TTL de 60 segundos").
 *
 * Programada: fica ativa sozinha entre data_inicio e data_fim.
 * Emergencial: ativa na hora, até alguém desativar (ou até a data_fim, se houver).
 */

const TTL = 60 * 1000;
let cache = { em: 0, valor: null };
const limparCache = () => (cache = { em: 0, valor: null });

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

function exigirSuperadmin(db) {
  const papeis = db.usuarios_papeis.filter((r) => r.id_usuario === eu()).map((r) => db.papeis.find((p) => p.id === r.id_papel));
  if (!papeis.some((p) => p?.permissoes.includes('*'))) throw new ApiError('Só o superusuário controla a manutenção', 403);
}

/** Calcula se está em manutenção AGORA (e desliga sozinha a programada que já acabou). */
function calcular(config) {
  const agora = Date.now();
  const inicio = config.data_inicio ? new Date(config.data_inicio).getTime() : null;
  const fim = config.data_fim ? new Date(config.data_fim).getTime() : null;
  const dentroDaJanela = (!inicio || agora >= inicio) && (!fim || agora < fim);
  const emManutencao = config.ativo && dentroDaJanela && config.tipo_manutencao !== 'silenciosa';
  return {
    em_manutencao: emManutencao,
    tipo: config.tipo_manutencao,
    agendada: config.ativo && inicio && agora < inicio,
    inicio: config.data_inicio,
    fim_previsto: config.data_fim,
    titulo: config.titulo_personalizado,
    mensagem: config.mensagem_personalizada,
    motivo: config.motivo_publico,
    // Header Retry-After (RNF047): quantos segundos o cliente deve esperar
    retry_after: emManutencao && fim ? Math.max(60, Math.round((fim - agora) / 1000)) : null,
  };
}

function encerrarSeVenceu(db) {
  const c = db.configuracoes_manutencao;
  if (c.ativo && c.data_fim && Date.now() >= new Date(c.data_fim).getTime()) {
    c.historico.unshift({ ...resumoJanela(c), encerrada_em: c.data_fim, encerrada_por: 'automático' });
    c.ativo = false;
    mockDb.salvar(db);
  }
}

const resumoJanela = (c) => ({ tipo: c.tipo_manutencao, inicio: c.data_inicio, fim_previsto: c.data_fim, motivo: c.motivo_publico, criada_por: c.created_by });

export const manutencaoService = {
  /** RF106 – status público, com cache de 60s. forcar=true ignora o cache (painel admin). */
  async status(forcar = false) {
    if (!forcar && cache.valor && Date.now() - cache.em < TTL) return cache.valor;
    let valor;
    if (!USE_MOCK) {
      valor = await http('/status');
    } else {
      const db = mockDb.ler();
      encerrarSeVenceu(db);
      valor = calcular(db.configuracoes_manutencao);
    }
    cache = { em: Date.now(), valor };
    return valor;
  },

  async config() {
    if (!USE_MOCK) return http('/admin/manutencao');
    await atraso(200);
    const db = mockDb.ler();
    exigirSuperadmin(db);
    encerrarSeVenceu(db);
    const usuario = (id) => db.usuarios.find((u) => u.id === id)?.nome;
    return {
      ...db.configuracoes_manutencao,
      estado: calcular(db.configuracoes_manutencao),
      acessos: db.log_acesso_manutencao.slice(-30).reverse().map((l) => ({ ...l, nome: usuario(l.id_usuario) })),
    };
  },

  /** RF100/RF102 – emergencial: ativa já. duracaoMin vazio = indeterminado. */
  async ativarEmergencial({ motivo, duracaoMin }) {
    if (!USE_MOCK) return http('/admin/manutencao/emergencial', { method: 'POST', body: { motivo, duracaoMin } });
    await atraso(300);
    const db = mockDb.ler();
    exigirSuperadmin(db);
    if (!motivo?.trim()) throw new ApiError('Informe o motivo (obrigatório na emergencial)', 422);
    const agora = new Date();
    Object.assign(db.configuracoes_manutencao, {
      ativo: true,
      tipo_manutencao: 'emergencial',
      data_inicio: agora.toISOString(),
      data_fim: duracaoMin ? new Date(agora.getTime() + duracaoMin * 60000).toISOString() : null,
      motivo_publico: motivo.trim(),
      created_by: eu(),
    });
    db.log_acesso_manutencao.push({ id: mockDb.proximoId(db.log_acesso_manutencao), id_usuario: eu(), acao: 'ativou_manutencao', dados_adicionais: { tipo: 'emergencial', motivo }, data_acesso: agora.toISOString() });
    registrarAuditoria(db, { acao: 'manutencao.ativar', tipo_recurso: 'sistema', observacao: motivo });
    mockDb.salvar(db);
    limparCache();
    return calcular(db.configuracoes_manutencao);
  },

  /** RF101 – programada, com início e fim obrigatórios. */
  async agendar({ inicio, fim, motivo, descricao, silenciosa }) {
    if (!USE_MOCK) return http('/admin/manutencao/agendar', { method: 'POST', body: { inicio, fim, motivo, descricao, silenciosa } });
    await atraso(300);
    const db = mockDb.ler();
    exigirSuperadmin(db);
    const ini = new Date(inicio);
    const f = new Date(fim);
    if (Number.isNaN(ini.getTime()) || Number.isNaN(f.getTime())) throw new ApiError('Informe início e fim', 422);
    if (f <= ini) throw new ApiError('O fim precisa ser depois do início', 422);
    if (f <= new Date()) throw new ApiError('Essa janela já passou', 422);
    Object.assign(db.configuracoes_manutencao, {
      ativo: true,
      tipo_manutencao: silenciosa ? 'silenciosa' : 'programada',
      data_inicio: ini.toISOString(),
      data_fim: f.toISOString(),
      motivo_publico: motivo.trim(),
      descricao_tecnica: descricao.trim(),
      created_by: eu(),
    });
    db.log_acesso_manutencao.push({ id: mockDb.proximoId(db.log_acesso_manutencao), id_usuario: eu(), acao: 'agendou_manutencao', dados_adicionais: { inicio, fim }, data_acesso: new Date().toISOString() });
    registrarAuditoria(db, { acao: 'manutencao.agendar', tipo_recurso: 'sistema', dados_depois: { inicio, fim } });
    mockDb.salvar(db);
    limparCache();
    return calcular(db.configuracoes_manutencao);
  },

  async desativar() {
    if (!USE_MOCK) return http('/admin/manutencao', { method: 'DELETE' });
    await atraso(250);
    const db = mockDb.ler();
    exigirSuperadmin(db);
    const c = db.configuracoes_manutencao;
    if (c.ativo) c.historico.unshift({ ...resumoJanela(c), encerrada_em: new Date().toISOString(), encerrada_por: db.usuarios.find((u) => u.id === eu())?.nome });
    c.historico = c.historico.slice(0, 20);
    c.ativo = false;
    db.log_acesso_manutencao.push({ id: mockDb.proximoId(db.log_acesso_manutencao), id_usuario: eu(), acao: 'desativou_manutencao', data_acesso: new Date().toISOString() });
    registrarAuditoria(db, { acao: 'manutencao.desativar', tipo_recurso: 'sistema' });
    mockDb.salvar(db);
    limparCache();
    return calcular(c);
  },

  /** RF103 – texto da página pública. */
  async personalizar({ titulo, mensagem }) {
    if (!USE_MOCK) return http('/admin/manutencao/pagina', { method: 'PUT', body: { titulo, mensagem } });
    await atraso(200);
    const db = mockDb.ler();
    exigirSuperadmin(db);
    Object.assign(db.configuracoes_manutencao, { titulo_personalizado: titulo.trim(), mensagem_personalizada: mensagem.trim() });
    mockDb.salvar(db);
    limparCache();
    return db.configuracoes_manutencao;
  },

  /** RF105 – registra que alguém da equipe entrou durante a manutenção (auditoria). */
  registrarAcessoDuranteManutencao() {
    if (!USE_MOCK) return;
    const db = mockDb.ler();
    const ultimo = db.log_acesso_manutencao.at(-1);
    // Evita uma linha por clique: no máximo um registro a cada 10 minutos por pessoa
    if (ultimo?.id_usuario === eu() && ultimo.acao === 'acesso_durante_manutencao' && Date.now() - new Date(ultimo.data_acesso) < 10 * 60000) return;
    db.log_acesso_manutencao.push({ id: mockDb.proximoId(db.log_acesso_manutencao), id_usuario: eu(), acao: 'acesso_durante_manutencao', data_acesso: new Date().toISOString(), user_agent: navigator.userAgent.slice(0, 80) });
    mockDb.salvar(db);
  },

  limparCache,
};
