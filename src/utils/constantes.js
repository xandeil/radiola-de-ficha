/*
 * Valores fixos do domínio, espelhando os ENUMs do banco.
 * Centralizar aqui evita "strings mágicas" espalhadas pelo código
 * (se você digitar 'Otimo' sem acento em uma página, o bug some no meio do caminho).
 */

export const TIPOS_MIDIA = [
  { valor: 'LP', rotulo: 'Vinil (LP)' },
  { valor: 'CD', rotulo: 'CD' },
  { valor: 'DVD', rotulo: 'DVD' },
  { valor: 'K7', rotulo: 'Fita K7' },
];

export const SUBTIPOS = {
  LP: ['LP', 'LP Duplo', 'EP', 'Compacto', '10"', '12"', 'Picture Disc'],
  CD: ['Álbum', 'Single', 'EP', 'Coletânea', 'Maxi Single', 'Digipak'],
  DVD: ['DVD Musical — Show', 'DVD Musical — Clipes', 'DVD Musical — Documentário', 'DVD de Filme'],
  K7: ['K7 Comercial', 'Gravação Caseira', 'Microcassete', 'DAT'],
};

export const VELOCIDADES = ['33⅓', '45', '78'];

export const ESTADOS_CONSERVACAO = ['Selado', 'Ótimo', 'Bom', 'Regular', 'Ruim'];

export const ESTADOS_CAPA = ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Sem Capa'];

export const LADOS = ['A', 'B', 'C', 'D'];

/** Tipos que têm "lado" (vinil e fita). CD e DVD não têm. */
export const TEM_LADO = ['LP', 'K7'];

export const ORDENACOES = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'titulo', rotulo: 'Título (A–Z)' },
  { valor: 'artista', rotulo: 'Artista (A–Z)' },
  { valor: 'ano', rotulo: 'Ano' },
];

export const LIMITE_PLANO_GRATUITO = 50; // RF046
