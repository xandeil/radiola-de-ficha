/*
 * Utilitários de pagamento — validações que todo dev brasileiro de
 * front-end acaba precisando: cartão (Luhn + bandeira), validade e CPF.
 */

export const soDigitos = (v) => String(v || '').replace(/\D/g, '');

/**
 * Algoritmo de Luhn: o último dígito do cartão é um verificador.
 * Da direita para a esquerda, dobre um dígito sim, outro não (se passar
 * de 9, subtraia 9) e some tudo. Cartão válido = soma múltipla de 10.
 * Pega erro de digitação ANTES de gastar uma chamada ao gateway.
 */
export function luhnValido(numero) {
  const d = soDigitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

/** Bandeira pelos primeiros dígitos (BIN). A ordem importa: Elo e Hipercard antes de Visa/Master. */
const BANDEIRAS = [
  { id: 'elo', nome: 'Elo', re: /^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7]\d|9\d{3})|627780|63(6297|6368)|650(03|04|05|4[0-9]|5[0-3]|9\d)|6516|6550)/ },
  { id: 'hipercard', nome: 'Hipercard', re: /^(606282|3841)/ },
  { id: 'amex', nome: 'American Express', re: /^3[47]/, cvv: 4, digitos: 15 },
  // 5031 4332... é o Mastercard de teste do Mercado Pago
  { id: 'master', nome: 'Mastercard', re: /^(5[1-5]|503143|2(2[2-9]|[3-6]\d|7[01]|720))/ },
  { id: 'visa', nome: 'Visa', re: /^4/ },
];

export function detectarBandeira(numero) {
  const d = soDigitos(numero);
  return BANDEIRAS.find((b) => b.re.test(d)) || null;
}

/** "5031433215406351" -> "5031 4332 1540 6351" (Amex usa 4-6-5) */
export function formatarNumeroCartao(valor) {
  const d = soDigitos(valor).slice(0, 19);
  if (detectarBandeira(d)?.id === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatarValidade(valor) {
  const d = soDigitos(valor).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function validadeOk(mmaa) {
  const [mm, aa] = mmaa.split('/').map(Number);
  if (!mm || mm < 1 || mm > 12 || aa === undefined || Number.isNaN(aa)) return false;
  const fimDoMes = new Date(2000 + aa, mm, 0, 23, 59, 59); // dia 0 do mês seguinte = último dia deste
  return fimDoMes >= new Date();
}

/**
 * CPF: 11 dígitos, os dois últimos são verificadores (módulo 11).
 * CPFs com todos os dígitos iguais (111.111.111-11) passam na conta mas são inválidos.
 */
export function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base) => {
    const soma = [...base].reduce((s, n, i) => s + Number(n) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10]);
}

export function formatarCpf(valor) {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
