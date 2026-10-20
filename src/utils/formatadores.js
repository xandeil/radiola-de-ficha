import { idiomaAtual, t as traduzir } from '@/i18n';

/*
 * Formatação sempre pelo idioma atual (Intl faz o trabalho pesado):
 *   pt-BR: 19/10/2026 · R$ 14,90 · há 3 horas
 *   en:    10/19/2026 · R$14.90  · 3 hours ago
 *   es:    19/10/2026 · 14,90 R$ · hace 3 horas  (narrowSymbol: sem isso o espanhol escreveria "14,90 BRL")
 * A moeda continua sendo REAL (os preços são cobrados no Brasil);
 * só o jeito de escrever muda.
 */

/** 245 -> "4:05" */
export function formatarDuracao(segundos) {
  if (segundos == null || Number.isNaN(segundos)) return '--:--';
  const total = Math.max(0, Math.floor(segundos));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** "4:05" -> 245. Aceita também só segundos ("245"). Retorna null se inválido. */
export function lerDuracao(texto) {
  if (!texto) return null;
  const limpo = String(texto).trim();
  if (/^\d+$/.test(limpo)) return Number(limpo);
  const partes = limpo.match(/^(\d{1,3}):([0-5]\d)$/);
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

// Os formatadores do Intl são "caros" de criar: guardamos um por idioma.
const cache = {};
function formatador(tipo, criar) {
  const chave = `${tipo}:${idiomaAtual()}`;
  cache[chave] ||= criar(idiomaAtual());
  return cache[chave];
}

export const formatarMoeda = (valor) =>
  valor == null || valor === '' ? '—' : formatador('moeda', (l) => new Intl.NumberFormat(l, { style: 'currency', currency: 'BRL', currencyDisplay: 'narrowSymbol' })).format(Number(valor));

export const formatarNumero = (valor, opcoes) => new Intl.NumberFormat(idiomaAtual(), opcoes).format(valor);

export function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(idiomaAtual());
}

export function formatarDataHora(iso, opcoes = { dateStyle: 'short', timeStyle: 'short' }) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(idiomaAtual(), opcoes);
}

/** Ano que faz sentido mostrar: lançamento ou, para K7 caseira, gravação. */
export const anoDoItem = (item) => item.ano_lancamento || item.ano_gravacao || null;

/** "há 3 h", "há 2 dias"... Intl.RelativeTimeFormat já traduz para o idioma atual. */
export function tempoRelativo(iso) {
  if (!iso) return '';
  const relativo = formatador('relativo', (l) => new Intl.RelativeTimeFormat(l, { numeric: 'auto' }));
  const segundos = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const unidades = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unidade, tamanho] of unidades) {
    if (Math.abs(segundos) >= tamanho) return relativo.format(Math.round(segundos / tamanho), unidade);
  }
  return traduzir('comum.agora');
}
