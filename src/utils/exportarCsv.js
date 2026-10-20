import { formatarDuracao } from './formatadores';
import { idiomaAtual, t as traduzir } from '@/i18n';
import { rotuloDominio } from '@/i18n/dominio';

/*
 * RF016 – Exportação do catálogo em CSV.
 * Usa ";" como separador porque o Excel em português espera isso (em inglês, ","),
 * e adiciona o BOM (﻿) para os acentos abrirem corretamente.
 */

// Função (e não constante) para os títulos saírem no idioma de AGORA, não no do carregamento.
const colunas = () => [
  [traduzir('campo.formato'), (i) => i.tipo_midia],
  [traduzir('campo.subtipo'), (i) => rotuloDominio('subtipo', i.subtipo)],
  [traduzir('campo.titulo'), (i) => i.titulo],
  [traduzir('catalogo.col.artista'), (i) => i.artista],
  [traduzir('campo.ano'), (i) => i.ano_lancamento || i.ano_gravacao],
  [traduzir('campo.gravadora'), (i) => i.gravadora],
  [traduzir('campo.pais'), (i) => i.pais_origem],
  [traduzir('campo.numeroCatalogo'), (i) => i.numero_catalogo],
  [traduzir('campo.codigoBarras'), (i) => i.codigo_barras],
  [traduzir('campo.conservacao'), (i) => rotuloDominio('conservacao', i.estado_conservacao)],
  [traduzir('campo.capa'), (i) => rotuloDominio('conservacao', i.estado_capa)],
  [traduzir('campo.precoPago'), (i) => i.preco_pago],
  [traduzir('campo.valorEstimado'), (i) => i.valor_estimado],
  [traduzir('faixas.csv.local'), (i) => i.localizacao?.local_principal],
  [traduzir('campo.movel'), (i) => i.localizacao?.movel],
  [traduzir('faixas.csv.prateleira'), (i) => i.localizacao?.prateleira],
  [traduzir('campo.posicao'), (i) => i.localizacao?.posicao],
  [traduzir('faixas.csv.faixas'), (i) => (i.faixas || []).map((f) => `${f.lado || ''}${f.numero}. ${f.titulo} (${formatarDuracao(f.duracao_segundos)})`).join(' | ')],
  [traduzir('faixas.csv.notas'), (i) => i.notas_pessoais],
];

// Excel em inglês espera vírgula; em português e espanhol, ponto e vírgula (a vírgula é o decimal)
const separador = () => (idiomaAtual() === 'en' ? ',' : ';');

const escapar = (valor, sep) => {
  const texto = valor == null ? '' : String(valor);
  return new RegExp(`["${sep}\\n]`).test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function exportarCsv(itens, nomeArquivo = 'radiola-catalogo.csv') {
  const sep = separador();
  const cols = colunas();
  const linhas = [
    cols.map(([titulo]) => escapar(titulo, sep)).join(sep),
    ...itens.map((item) => cols.map(([, pegar]) => escapar(pegar(item), sep)).join(sep)),
  ];
  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
