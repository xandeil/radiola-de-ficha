import { tokenStorage } from './api';
import { mockDb } from './mockDb';

/*
 * Logs de auditoria (RNF034, seção 10.2, tabela logs_auditoria).
 * Toda ação administrativa grava QUEM fez, O QUÊ, EM QUÊ, e o ANTES/DEPOIS.
 * Assim dá para responder "quem suspendeu essa conta?" meses depois.
 * No back-end real isso vira um middleware que registra automaticamente.
 */
export function registrarAuditoria(db, { acao, tipo_recurso, recurso_id = null, dados_antes = null, dados_depois = null, observacao = null }) {
  db.logs_auditoria = db.logs_auditoria || [];
  db.logs_auditoria.push({
    id: mockDb.proximoId(db.logs_auditoria),
    timestamp: new Date().toISOString(),
    id_usuario: Number((tokenStorage.get() || '').replace('mock-token-', '')) || null,
    acao,
    tipo_recurso,
    recurso_id,
    dados_antes,
    dados_depois,
    ip: '127.0.0.1', // no mock não há IP real; o servidor preenche com o IP da requisição
    user_agent: navigator.userAgent.slice(0, 120),
    sucesso: true,
    observacao,
  });
  if (db.logs_auditoria.length > 1000) db.logs_auditoria = db.logs_auditoria.slice(-1000);
}
