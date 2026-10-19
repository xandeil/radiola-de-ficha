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

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor) => (valor == null || valor === '' ? '—' : moeda.format(Number(valor)));

export function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** Ano que faz sentido mostrar: lançamento ou, para K7 caseira, gravação. */
export const anoDoItem = (item) => item.ano_lancamento || item.ano_gravacao || null;
