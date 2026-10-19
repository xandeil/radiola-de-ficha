import { formatarDuracao } from './formatadores';

/*
 * RF016 – Exportação do catálogo em CSV.
 * Usa ";" como separador porque o Excel em português espera isso,
 * e adiciona o BOM (﻿) para os acentos abrirem corretamente.
 */

const COLUNAS = [
  ['Tipo', (i) => i.tipo_midia],
  ['Subtipo', (i) => i.subtipo],
  ['Título', (i) => i.titulo],
  ['Artista', (i) => i.artista],
  ['Ano', (i) => i.ano_lancamento || i.ano_gravacao],
  ['Gravadora', (i) => i.gravadora],
  ['País', (i) => i.pais_origem],
  ['Nº catálogo', (i) => i.numero_catalogo],
  ['Código de barras', (i) => i.codigo_barras],
  ['Conservação', (i) => i.estado_conservacao],
  ['Capa', (i) => i.estado_capa],
  ['Preço pago', (i) => i.preco_pago],
  ['Valor estimado', (i) => i.valor_estimado],
  ['Local', (i) => i.localizacao?.local_principal],
  ['Móvel', (i) => i.localizacao?.movel],
  ['Prateleira', (i) => i.localizacao?.prateleira],
  ['Posição', (i) => i.localizacao?.posicao],
  ['Faixas', (i) => (i.faixas || []).map((f) => `${f.lado || ''}${f.numero}. ${f.titulo} (${formatarDuracao(f.duracao_segundos)})`).join(' | ')],
  ['Notas', (i) => i.notas_pessoais],
];

const escapar = (valor) => {
  const texto = valor == null ? '' : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function exportarCsv(itens, nomeArquivo = 'radiola-catalogo.csv') {
  const linhas = [
    COLUNAS.map(([titulo]) => titulo).join(';'),
    ...itens.map((item) => COLUNAS.map(([, pegar]) => escapar(pegar(item))).join(';')),
  ];
  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
