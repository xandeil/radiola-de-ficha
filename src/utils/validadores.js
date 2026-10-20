/*
 * Funções puras de validação: recebem um valor e devolvem uma mensagem
 * de erro (string) ou null. Puras = fáceis de testar e reutilizar.
 * Lembre: validar no front é conforto para o usuário; quem garante
 * segurança de verdade é o back-end validando de novo.
 *
 * As mensagens vêm do dicionário (t) e saem no idioma atual.
 */
import { t as traduzir } from '@/i18n';

export const obrigatorio = (valor, campo = traduzir('validar.esteCampo')) =>
  valor == null || String(valor).trim() === '' ? traduzir('validar.obrigatorio', { campo }) : null;

export const email = (valor) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim()) ? null : traduzir('validar.email');

/** RNF022: mínimo 8 caracteres, letras, números e caractere especial */
export function senhaForte(valor = '') {
  if (valor.length < 8) return traduzir('validar.senhaTamanho');
  if (!/[a-zA-Z]/.test(valor)) return traduzir('validar.senhaLetra');
  if (!/\d/.test(valor)) return traduzir('validar.senhaNumero');
  if (!/[^a-zA-Z0-9]/.test(valor)) return traduzir('validar.senhaEspecial');
  return null;
}

export function ano(valor) {
  if (valor === '' || valor == null) return null;
  const n = Number(valor);
  const atual = new Date().getFullYear();
  return Number.isInteger(n) && n >= 1890 && n <= atual + 1 ? null : traduzir('validar.ano', { max: atual + 1 });
}

/** Remove chaves cujo valor é null, para o objeto de erros ficar limpo. */
export const limparErros = (erros) => Object.fromEntries(Object.entries(erros).filter(([, v]) => v));
