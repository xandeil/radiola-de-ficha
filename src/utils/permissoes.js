/*
 * Checagem de permissões (RBAC, seção 10.1).
 *
 * Formatos aceitos na lista de permissões do usuário:
 *   '*'                -> tudo (superadmin)
 *   'tickets.*'        -> qualquer ação sobre tickets
 *   'tickets.responder'-> uma ação específica
 *
 * ⚠️ No front, isto só decide o que MOSTRAR. Toda rota do back-end
 * precisa checar de novo (o AdminMiddleware.php do documento).
 */
export function temPermissao(usuario, permissao) {
  const lista = usuario?.permissoes || [];
  if (lista.includes('*') || lista.includes(permissao)) return true;
  const [recurso] = permissao.split('.');
  return lista.includes(`${recurso}.*`);
}

export const ehEquipe = (usuario) => temPermissao(usuario, 'admin.acessar');
