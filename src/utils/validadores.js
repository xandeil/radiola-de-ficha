/*
 * Funções puras de validação: recebem um valor e devolvem uma mensagem
 * de erro (string) ou null. Puras = fáceis de testar e reutilizar.
 * Lembre: validar no front é conforto para o usuário; quem garante
 * segurança de verdade é o back-end validando de novo.
 */

export const obrigatorio = (valor, campo = 'Este campo') =>
  valor == null || String(valor).trim() === '' ? `${campo} é obrigatório` : null;

export const email = (valor) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim()) ? null : 'Informe um e-mail válido';

/** RNF022: mínimo 8 caracteres, letras, números e caractere especial */
export function senhaForte(valor = '') {
  if (valor.length < 8) return 'A senha precisa ter pelo menos 8 caracteres';
  if (!/[a-zA-Z]/.test(valor)) return 'Inclua pelo menos uma letra';
  if (!/\d/.test(valor)) return 'Inclua pelo menos um número';
  if (!/[^a-zA-Z0-9]/.test(valor)) return 'Inclua pelo menos um caractere especial';
  return null;
}

export function ano(valor) {
  if (valor === '' || valor == null) return null;
  const n = Number(valor);
  const atual = new Date().getFullYear();
  return Number.isInteger(n) && n >= 1890 && n <= atual + 1 ? null : `Ano entre 1890 e ${atual + 1}`;
}

/** Remove chaves cujo valor é null, para o objeto de erros ficar limpo. */
export const limparErros = (erros) => Object.fromEntries(Object.entries(erros).filter(([, v]) => v));
