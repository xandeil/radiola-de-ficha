import { itensMock, usuariosMock } from '@/mocks/dados';
import { catalogosMock } from '@/mocks/catalogos';
import {
  amizadesMock,
  generosItensDemo,
  gruposMock,
  interacoesMock,
  itensOutrosMock,
  membrosGrupoMock,
  outrosUsuariosMock,
  postsGrupoMock,
  postsMock,
} from '@/mocks/social';
import { assinaturasMock, campanhasMock, cuponsMock } from '@/mocks/assinatura';
import {
  artigosAjudaMock,
  automacoesMock,
  equipeMock,
  gerarBackupsMock,
  manutencaoPadrao,
  papeisMock,
  respostasMock,
  ticketsMock,
  usuariosPapeisMock,
} from '@/mocks/admin';

/*
 * "Banco de dados" do modo mock, salvo no localStorage.
 * Assim o que você cadastra continua lá depois de recarregar a página.
 * Para zerar: abra o DevTools > Application > Local Storage e apague "radiola.db".
 *
 * MIGRAÇÕES: quando o formato muda (ex.: a Fase 3 trouxe tabelas sociais),
 * não apagamos o que você já cadastrou. Cada versão tem uma função que
 * transforma o banco da versão anterior na nova — igual migrations de
 * Laravel/Rails num back-end de verdade.
 */

const DB_KEY = 'radiola.db';
const VERSAO = 5;

const MIGRACOES = {
  // v1 -> v2: Fase 3 (rede social, gênero nos itens)
  2(db) {
    const idsUsuarios = new Set(db.usuarios.map((u) => u.id));
    db.usuarios.push(...outrosUsuariosMock.filter((u) => !idsUsuarios.has(u.id)));
    db.usuarios.forEach((u) => {
      if (!u.apelido) u.apelido = `colecionador${u.id}`;
    });

    db.itens.forEach((i) => {
      if (!i.genero && generosItensDemo[i.id] && i.id_usuario === 1) i.genero = generosItensDemo[i.id];
    });
    const idsItens = new Set(db.itens.map((i) => i.id));
    db.itens.push(...itensOutrosMock.filter((i) => !idsItens.has(i.id)));

    db.amizades = db.amizades || amizadesMock;
    db.posts = db.posts || postsMock;
    db.interacoes = db.interacoes || interacoesMock;
    db.grupos = db.grupos || gruposMock;
    db.membros_grupo = db.membros_grupo || membrosGrupoMock;
    db.posts_grupo = db.posts_grupo || postsGrupoMock;
    db.conquistas_usuarios = db.conquistas_usuarios || [];
    db.convites = db.convites || [];
    return db;
  },

  // v2 -> v3: Fase 4 (assinaturas, pagamentos, publicidade)
  3(db) {
    db.assinaturas = db.assinaturas || structuredClone(assinaturasMock);
    db.transacoes = db.transacoes || [];
    db.cupons = db.cupons || structuredClone(cuponsMock);
    db.motivos_cancelamento = db.motivos_cancelamento || [];
    db.campanhas = db.campanhas || structuredClone(campanhasMock);
    db.impressoes_propaganda = db.impressoes_propaganda || [];
    db.cliques_propaganda = db.cliques_propaganda || [];
    db.cliques_afiliados = db.cliques_afiliados || [];
    db.membros_familia = db.membros_familia || [];
    // O plano agora vem da assinatura; deixamos o campo do usuário em sincronia
    db.usuarios.forEach((u) => {
      const a = db.assinaturas.find((x) => x.id_usuario === u.id && ['ativa', 'trial'].includes(x.status));
      u.plano = a ? { 2: 'premium_mensal', 3: 'premium_anual', 4: 'familia', 5: 'estudante' }[a.id_plano] : 'gratuito';
    });
    return db;
  },

  // v3 -> v4: Fase 5 (equipe, suporte, backup, manutenção, auditoria, CRM)
  4(db) {
    const ids = new Set(db.usuarios.map((u) => u.id));
    db.usuarios.push(...structuredClone(equipeMock).filter((u) => !ids.has(u.id)));
    db.usuarios.forEach((u) => {
      if (u.ativo === undefined) u.ativo = true;
      if (!u.ultimo_login) u.ultimo_login = u.data_cadastro || new Date().toISOString();
    });
    // João "sumiu" há 40 dias, para aparecer no segmento de inativos do CRM
    const joao = db.usuarios.find((u) => u.id === 3);
    if (joao) joao.ultimo_login = new Date(Date.now() - 40 * 86400000).toISOString();

    db.papeis = db.papeis || structuredClone(papeisMock);
    db.usuarios_papeis = db.usuarios_papeis || structuredClone(usuariosPapeisMock);
    db.artigos_ajuda = db.artigos_ajuda || structuredClone(artigosAjudaMock);
    db.tickets_suporte = db.tickets_suporte || structuredClone(ticketsMock);
    db.tickets_respostas = db.tickets_respostas || structuredClone(respostasMock);
    db.pesquisas_satisfacao = db.pesquisas_satisfacao || [];
    db.backups_registros = db.backups_registros || gerarBackupsMock();
    db.restauracoes_solicitacoes = db.restauracoes_solicitacoes || [];
    db.configuracoes_manutencao = db.configuracoes_manutencao || structuredClone(manutencaoPadrao);
    db.log_acesso_manutencao = db.log_acesso_manutencao || [];
    db.logs_auditoria = db.logs_auditoria || [];
    db.automacoes = db.automacoes || structuredClone(automacoesMock);
    db.emails_enviados = db.emails_enviados || [];
    return db;
  },

  // v4 -> v5: 10 discos em armários diferentes para cada conta de teste
  5(db) {
    const idsUsuarios = new Set(db.usuarios.map((u) => u.id));
    const idsItens = new Set(db.itens.map((i) => i.id));
    db.itens.push(...structuredClone(catalogosMock).filter((i) => idsUsuarios.has(i.id_usuario) && !idsItens.has(i.id)));
    return db;
  },
};

function migrar(db) {
  for (let v = (db.versao || 1) + 1; v <= VERSAO; v++) {
    db = MIGRACOES[v](db);
    db.versao = v;
  }
  return db;
}

function carregar() {
  let db;
  try {
    db = JSON.parse(localStorage.getItem(DB_KEY));
  } catch {
    db = null; // JSON corrompido: recria abaixo
  }
  if (!db) db = { versao: 1, usuarios: structuredClone(usuariosMock), itens: structuredClone(itensMock) };
  if (db.versao !== VERSAO) {
    db = migrar(db);
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
  return db;
}

export const mockDb = {
  ler() {
    return carregar();
  },
  salvar(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  },
  proximoId(lista) {
    return lista.reduce((maior, x) => Math.max(maior, x.id), 0) + 1;
  },
};
