import { USE_MOCK, http, tokenStorage } from './api';
import { mockDb } from './mockDb';
import { edicoesDemo } from '@/mocks/scannerDemo';
import { variacoesDoCodigo } from '@/utils/codigoBarras';
import { t as traduzir } from '@/i18n';

/*
 * Módulo de escaneamento (seção 6 do documento, RF012).
 *
 * Fluxo: código lido -> cache -> demonstração -> MusicBrainz -> lista de edições.
 *
 * Por que MusicBrainz direto do navegador e não o Discogs?
 *  - MusicBrainz é aberto, não exige chave e aceita chamadas do navegador (CORS).
 *  - Discogs exige um token pessoal; token no front-end fica visível para
 *    qualquer um no DevTools. Por isso o documento põe o Discogs no back-end
 *    (ScannerController / DiscogsService). Com VITE_USE_MOCK=false, este service
 *    chama GET /scanner/:codigo e o PHP decide quais APIs consultar.
 *
 * Educação com APIs abertas: o MusicBrainz pede no máximo 1 requisição por
 * segundo. O cache de 30 dias (seção 6.2.5) ajuda a respeitar isso.
 */

const MB = 'https://musicbrainz.org/ws/2';
const CAA = 'https://coverartarchive.org';
const CACHE_KEY = 'radiola.scanner.cache';
const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

const PAISES = { BR: 'Brasil', US: 'EUA', GB: 'Reino Unido', DE: 'Alemanha', JP: 'Japão', FR: 'França', IT: 'Itália', AR: 'Argentina', PT: 'Portugal', CA: 'Canadá', XE: 'Europa', XW: 'Mundial' };

// ---------- cache ----------
function lerCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function salvarNoCache(chave, dados) {
  const cache = lerCache();
  cache[chave] = { dados, expira_em: Date.now() + TRINTA_DIAS };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* cheio: segue sem cache */
  }
}

function doCache(chave) {
  const salvo = lerCache()[chave];
  return salvo && salvo.expira_em > Date.now() ? salvo.dados : null;
}

// ---------- tradução MusicBrainz -> formato da Radiola ----------
function formatoDaMidia(formato = '') {
  const f = formato.toLowerCase();
  if (f.includes('vinyl') || f.includes('"')) return 'LP';
  if (f.includes('cassette')) return 'K7';
  if (f.includes('dvd')) return 'DVD';
  if (f.includes('cd')) return 'CD';
  return 'Outro';
}

const artistaDe = (credito = []) => credito.map((c) => c.name + (c.joinphrase || '')).join('').trim();

function normalizarRelease(r) {
  const midia = r.media?.[0]?.format || '';
  const label = r['label-info']?.[0];
  return {
    id: r.id,
    fonte: 'MusicBrainz',
    titulo: r.title,
    artista: artistaDe(r['artist-credit']),
    ano: r.date ? Number(r.date.slice(0, 4)) : null,
    pais: PAISES[r.country] || r.country || '',
    gravadora: label?.label?.name || '',
    numero_catalogo: label?.['catalog-number'] || '',
    formato: formatoDaMidia(midia),
    descricao_formato: [midia, r['release-group']?.['primary-type'], r.status].filter(Boolean).join(', '),
    // A capa vem do Cover Art Archive (projeto irmão do MusicBrainz). Se não houver, a <img> falha e mostramos a capa gerada.
    capa_imagem: `${CAA}/release/${r.id}/front-250`,
    faixas: null, // carregadas só quando o usuário escolhe a edição (economiza requisições)
  };
}

/** "A1" -> lado A; "3" -> sem lado. Discos de vinil no MusicBrainz costumam numerar assim. */
function ladoDoNumero(numero) {
  const m = String(numero || '').match(/^([A-H])\d*/i);
  return m ? m[1].toUpperCase() : null;
}

async function mb(caminho) {
  const resposta = await fetch(`${MB}${caminho}${caminho.includes('?') ? '&' : '?'}fmt=json`, {
    headers: { Accept: 'application/json' },
  });
  if (resposta.status === 503) throw new Error(traduzir('scanner.erro.mbOcupado'));
  if (!resposta.ok) throw new Error(traduzir('scanner.erro.mb'));
  return resposta.json();
}

function registrarLog(codigo, sucesso, mensagem_erro = null) {
  if (!USE_MOCK) return; // no back-end real, o próprio ScannerController grava o log
  const db = mockDb.ler();
  db.log_escaneamentos = db.log_escaneamentos || [];
  db.log_escaneamentos.push({
    id: mockDb.proximoId(db.log_escaneamentos),
    id_usuario: Number((tokenStorage.get() || '').replace('mock-token-', '')),
    codigo_escaneado: codigo,
    sucesso,
    mensagem_erro,
    data_escaneamento: new Date().toISOString(),
  });
  mockDb.salvar(db);
}

export const scannerService = {
  /**
   * Recebe a análise do código (de analisarCodigo) e devolve
   * { edicoes, origem } — origem: 'cache' | 'demonstração' | 'MusicBrainz' | 'servidor'.
   */
  async buscarPorCodigo(analise) {
    const { codigo } = analise;
    if (!USE_MOCK) return { edicoes: await http(`/scanner/${codigo}`), origem: 'servidor' };

    const emCache = doCache(`codigo:${codigo}`);
    if (emCache) return { edicoes: emCache, origem: 'cache' };

    if (edicoesDemo[codigo]) {
      registrarLog(codigo, true);
      return { edicoes: edicoesDemo[codigo], origem: 'demonstração' };
    }

    try {
      // Busca todas as variações (UPC de 12 e EAN de 13) numa consulta só
      const consulta = variacoesDoCodigo(analise).map((v) => `barcode:${v}`).join(' OR ');
      const dados = await mb(`/release/?query=${encodeURIComponent(consulta)}&limit=12`);
      const edicoes = (dados.releases || []).map(normalizarRelease);
      if (edicoes.length) salvarNoCache(`codigo:${codigo}`, edicoes);
      registrarLog(codigo, edicoes.length > 0, edicoes.length ? null : 'Nenhuma edição encontrada');
      return { edicoes, origem: 'MusicBrainz' };
    } catch (e) {
      registrarLog(codigo, false, e.message);
      throw e;
    }
  },

  /** Seção 6.2.6 – disco antigo sem código: busca por título e artista. */
  async buscarPorTexto(titulo, artista) {
    if (!USE_MOCK) return http(`/scanner/busca?${new URLSearchParams({ titulo, artista })}`);
    const chave = `texto:${titulo}|${artista}`.toLowerCase();
    const emCache = doCache(chave);
    if (emCache) return emCache;

    const partes = [`release:"${titulo.replace(/"/g, '')}"`];
    if (artista.trim()) partes.push(`artist:"${artista.replace(/"/g, '')}"`);
    const dados = await mb(`/release/?query=${encodeURIComponent(partes.join(' AND '))}&limit=15`);
    const edicoes = (dados.releases || []).map(normalizarRelease);
    if (edicoes.length) salvarNoCache(chave, edicoes);
    return edicoes;
  },

  /** Carrega as faixas da edição escolhida (só a demonstração já vem com elas). */
  async detalhar(edicao) {
    if (edicao.faixas) return edicao;
    const chave = `release:${edicao.id}`;
    const emCache = doCache(chave);
    if (emCache) return emCache;

    const r = await mb(`/release/${edicao.id}?inc=recordings+artist-credits+labels`);
    let numero = 0;
    const faixas = (r.media || []).flatMap((m) =>
      (m.tracks || []).map((t) => ({
        numero: ++numero,
        lado: ladoDoNumero(t.number),
        titulo: t.title,
        duracao_segundos: t.length ? Math.round(t.length / 1000) : null,
      })),
    );
    const completo = { ...edicao, faixas };
    salvarNoCache(chave, completo);
    return completo;
  },

  /**
   * Converte a edição escolhida no formato do formulário de cadastro.
   * O formulário recebe isso pelo "state" da navegação (veja ItemFormularioPage).
   */
  paraCadastro(edicao, codigo) {
    const tipo = ['LP', 'CD', 'DVD', 'K7'].includes(edicao.formato) ? edicao.formato : 'CD';
    return {
      tipo_midia: tipo,
      titulo: edicao.titulo,
      artista: edicao.artista,
      ano_lancamento: edicao.ano || '',
      gravadora: edicao.gravadora,
      pais_origem: edicao.pais,
      numero_catalogo: edicao.numero_catalogo,
      codigo_barras: codigo || '',
      capa_imagem: edicao.capa_imagem || '',
      cor_capa: edicao.cor_capa || '#3f6d7a',
      faixas: (edicao.faixas || []).map((f) => ({ ...f, lado: ['LP', 'K7'].includes(tipo) ? f.lado || 'A' : null })),
    };
  },
};
