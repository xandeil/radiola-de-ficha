import { t as traduzir } from '@/i18n';
/*
 * Encarte digital (RF038–RF040): busca textos sobre artista, álbum e faixa
 * na Wikipédia em português.
 *
 * Duas APIs públicas da Wikipédia, ambas liberadas para chamar do navegador:
 *  - Busca:   /w/api.php?action=query&list=search  -> lista de páginas candidatas
 *  - Resumo:  /api/rest_v1/page/summary/{título}   -> primeiro parágrafo + imagem
 *
 * Cache (RNF007): cada resposta fica 7 dias no localStorage. Encarte não muda
 * toda hora, e assim abrir o mesmo disco de novo é instantâneo e não gasta
 * requisição. No back-end real, esse cache vira uma tabela (encarte_conteudo).
 *
 * Os textos da Wikipédia são licença CC BY-SA: por isso sempre exibimos
 * a fonte com link para a página original.
 */

const WIKI = 'https://pt.wikipedia.org';
const CACHE_KEY = 'radiola.encarte.cache';
const ESCOLHAS_KEY = 'radiola.encarte.escolhas';
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

// ---------- cache simples com expiração ----------
function lerJson(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave)) || {};
  } catch {
    return {};
  }
}

function salvarJson(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* localStorage cheio: segue sem cache */
  }
}

async function comCache(chave, buscar) {
  const cache = lerJson(CACHE_KEY);
  const salvo = cache[chave];
  if (salvo && salvo.expira > Date.now()) return salvo.dados;

  const dados = await buscar();
  cache[chave] = { dados, expira: Date.now() + SETE_DIAS };
  salvarJson(CACHE_KEY, cache);
  return dados;
}

// ---------- chamadas à Wikipédia ----------
async function pesquisar(termo) {
  return comCache(`busca:${termo}`, async () => {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: termo,
      srlimit: '6',
      format: 'json',
      origin: '*', // necessário para a Wikipédia aceitar chamada de outro domínio (CORS)
    });
    const resposta = await fetch(`${WIKI}/w/api.php?${params}`);
    if (!resposta.ok) throw new Error(traduzir('erros.wikipedia'));
    const dados = await resposta.json();
    return dados.query.search.map((r) => r.title);
  });
}

async function resumo(titulo) {
  return comCache(`resumo:${titulo}`, async () => {
    const resposta = await fetch(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, '_'))}`);
    if (!resposta.ok) throw new Error(traduzir('erros.wikipedia404'));
    const p = await resposta.json();
    return {
      titulo: p.title,
      texto: p.extract,
      imagem: p.thumbnail?.source || null,
      url: p.content_urls?.desktop?.page || `${WIKI}/wiki/${encodeURIComponent(titulo)}`,
      desambiguacao: p.type === 'disambiguation',
    };
  });
}

/** Monta o termo de busca de cada seção do encarte. */
function termoDaSecao(secao, { artista, album, faixa }) {
  const semVarios = artista && artista !== 'Vários Artistas' ? artista : '';
  if (secao === 'artista') return semVarios;
  if (secao === 'album') return `${album} ${semVarios} álbum`.trim();
  return `${faixa} ${semVarios} canção`.trim();
}

export const encarteService = {
  /**
   * Devolve { conteudo, alternativas } para uma seção do encarte.
   * "contexto" identifica a seção (ex.: "album:Clube da Esquina") para
   * lembrar se o usuário corrigiu manualmente qual página é a certa.
   */
  async buscarSecao(secao, dados) {
    const termo = termoDaSecao(secao, dados);
    if (!termo) return { conteudo: null, alternativas: [] };

    const contexto = `${secao}:${termo}`;
    const escolhida = lerJson(ESCOLHAS_KEY)[contexto];
    const candidatas = await pesquisar(termo);
    const titulo = escolhida || candidatas[0];
    if (!titulo) return { conteudo: null, alternativas: [], contexto };

    const conteudo = await resumo(titulo);
    return { conteudo, alternativas: candidatas.filter((c) => c !== titulo), contexto };
  },

  /** RF042 – o usuário diz "não é esse, é este outro". */
  escolherPagina(contexto, titulo) {
    const escolhas = lerJson(ESCOLHAS_KEY);
    escolhas[contexto] = titulo;
    salvarJson(ESCOLHAS_KEY, escolhas);
  },
};
