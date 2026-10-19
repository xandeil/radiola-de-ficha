/*
 * Validação de códigos de barras (seção 6.2.2 do documento).
 *
 * Todo EAN-13 e UPC-A termina com um DÍGITO VERIFICADOR, calculado a partir
 * dos outros. Conferir esse dígito no front evita mandar ao servidor um
 * código lido pela metade (o que acontece bastante com câmera tremida).
 *
 * Cálculo do EAN-13 (o UPC-A é igual, com um zero na frente):
 *   1. Pegue os 12 primeiros dígitos.
 *   2. Multiplique alternadamente por 1 e 3 (da esquerda para a direita).
 *   3. Some tudo. O verificador é o que falta para chegar à próxima dezena.
 */

const somenteDigitos = (texto) => String(texto || '').replace(/[^0-9Xx]/g, '').toUpperCase();

function verificadorEan13(doze) {
  const soma = [...doze].reduce((total, d, i) => total + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (soma % 10)) % 10;
}

function isbn10Valido(codigo) {
  if (!/^\d{9}[\dX]$/.test(codigo)) return false;
  const soma = [...codigo].reduce((total, c, i) => total + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
  return soma % 11 === 0;
}

/**
 * Analisa um código e devolve { valido, tipo, codigo, erro }.
 * "codigo" volta normalizado: UPC-A vira EAN-13 (com 0 na frente), que é
 * como Discogs e MusicBrainz guardam a maioria dos códigos.
 */
export function analisarCodigo(entrada) {
  const codigo = somenteDigitos(entrada);

  if (codigo.length === 13) {
    const valido = verificadorEan13(codigo.slice(0, 12)) === Number(codigo[12]);
    const tipo = codigo.startsWith('978') || codigo.startsWith('979') ? 'ISBN-13' : 'EAN-13';
    return valido ? { valido, tipo, codigo } : { valido, tipo, codigo, erro: 'Dígito verificador não confere — leia de novo' };
  }
  if (codigo.length === 12) {
    const comoEan = `0${codigo}`;
    const valido = verificadorEan13(comoEan.slice(0, 12)) === Number(comoEan[12]);
    return valido ? { valido, tipo: 'UPC', codigo: comoEan, original: codigo } : { valido, tipo: 'UPC', codigo, erro: 'Dígito verificador não confere — leia de novo' };
  }
  if (codigo.length === 10) {
    const valido = isbn10Valido(codigo);
    return valido ? { valido, tipo: 'ISBN-10', codigo } : { valido, tipo: 'ISBN-10', codigo, erro: 'ISBN inválido' };
  }
  return { valido: false, tipo: null, codigo, erro: codigo ? 'O código precisa ter 10, 12 ou 13 dígitos' : 'Digite o código' };
}

/** Variações para buscar: o mesmo disco pode estar cadastrado com UPC (12) ou EAN (13). */
export function variacoesDoCodigo({ codigo, original }) {
  const lista = [codigo];
  if (original) lista.push(original);
  if (codigo.length === 13 && codigo.startsWith('0')) lista.push(codigo.slice(1));
  return [...new Set(lista)];
}
