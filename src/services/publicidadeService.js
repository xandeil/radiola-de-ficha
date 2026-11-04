import { USE_MOCK, http, tokenStorage } from './api';
import { mockDb } from './mockDb';
import { programasAfiliadosMock } from '@/mocks/assinatura';

/*
 * Propagandas (seção 8) e afiliados (8.3).
 *
 * LIMITE DE FREQUÊNCIA (tabela 8.1 do documento): cada formato tem um teto
 * por período. Guardamos os horários das últimas exibições no localStorage;
 * se o teto foi atingido, escolher() devolve null e o espaço some.
 * Propaganda que aparece demais deixa de ser "não intrusiva" (RF046).
 *
 * SEGMENTAÇÃO CONTEXTUAL (8.2): se a tela informa um gênero ou formato
 * (ex.: o usuário está vendo uma K7), preferimos a campanha que combina.
 * Nada de dados pessoais: só o contexto da tela.
 */

const HORA = 3600 * 1000;
const LIMITES = {
  banner: { max: 3, janela: HORA },
  card: { max: 2, janela: HORA },
  post_nativo: { max: 1, janela: 24 * HORA },
  vinheta: { max: 1, janela: 'sessao' },
  intersticial: { max: 6, janela: HORA },
};

const FREQ_KEY = 'radiola.ads.frequencia';
const SESSAO_KEY = 'radiola.ads.sessao';

function lerFrequencia() {
  try {
    return JSON.parse(localStorage.getItem(FREQ_KEY)) || {};
  } catch {
    return {};
  }
}

function podeExibir(formato) {
  const limite = LIMITES[formato];
  if (!limite) return true;
  if (limite.janela === 'sessao') {
    const vistos = JSON.parse(sessionStorage.getItem(SESSAO_KEY) || '{}');
    return (vistos[formato] || 0) < limite.max;
  }
  const recentes = (lerFrequencia()[formato] || []).filter((t) => Date.now() - t < limite.janela);
  return recentes.length < limite.max;
}

function marcarExibicao(formato) {
  const limite = LIMITES[formato];
  if (limite?.janela === 'sessao') {
    const vistos = JSON.parse(sessionStorage.getItem(SESSAO_KEY) || '{}');
    vistos[formato] = (vistos[formato] || 0) + 1;
    sessionStorage.setItem(SESSAO_KEY, JSON.stringify(vistos));
    return;
  }
  const freq = lerFrequencia();
  freq[formato] = [...(freq[formato] || []).filter((t) => Date.now() - (limite?.janela || HORA) < t), Date.now()];
  try {
    localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
  } catch {
    /* ignora */
  }
}

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', '')) || null;

function combina(campanha, contexto) {
  const seg = campanha.segmentacao_json || {};
  let pontos = 0;
  if (contexto?.genero && seg.generos?.includes(contexto.genero)) pontos += 2;
  if (contexto?.formato && seg.formatos?.includes(contexto.formato)) pontos += 2;
  if (!seg.generos && !seg.formatos) pontos += 1; // campanha genérica serve para qualquer contexto
  return pontos;
}

export const publicidadeService = {
  /**
   * Escolhe uma campanha para o formato, respeitando frequência e contexto.
   * Devolve null quando não deve exibir nada.
   * O "upgrade" (anúncio da própria Radiola Premium) entra quando não há campanha.
   */
  escolher(formato, contexto = {}) {
    if (!podeExibir(formato)) return null;
    // banner e card podem usar campanhas um do outro: são o mesmo tipo de peça visual
    const aceitos = formato === 'banner' || formato === 'card' ? ['banner', 'card'] : [formato];
    const campanhas = (USE_MOCK ? mockDb.ler().campanhas : []).filter((c) => c.status === 'ativa' && aceitos.includes(c.formato));
    if (!campanhas.length) return null;

    const pontuadas = campanhas.map((c) => ({ c, p: combina(c, contexto) + Math.random() })); // o aleatório gira as campanhas
    pontuadas.sort((a, b) => b.p - a.p);
    marcarExibicao(formato);
    return pontuadas[0].c;
  },

  registrarImpressao(campanha, formato, pagina) {
    if (!USE_MOCK) return http('/propagandas/impressoes', { method: 'POST', body: { id_propaganda: campanha.id, formato, pagina } }).catch(() => {});
    const db = mockDb.ler();
    const impressao = { id: mockDb.proximoId(db.impressoes_propaganda), id_propaganda: campanha.id, id_usuario: eu(), formato, pagina, timestamp: new Date().toISOString() };
    db.impressoes_propaganda.push(impressao);
    // Mantém o mock leve: só as 500 últimas
    if (db.impressoes_propaganda.length > 500) db.impressoes_propaganda = db.impressoes_propaganda.slice(-500);
    mockDb.salvar(db);
    return impressao.id;
  },

  registrarClique(idImpressao) {
    if (!USE_MOCK) return http('/propagandas/cliques', { method: 'POST', body: { id_impressao: idImpressao } }).catch(() => {});
    const db = mockDb.ler();
    db.cliques_propaganda.push({ id: mockDb.proximoId(db.cliques_propaganda), id_impressao: idImpressao, timestamp: new Date().toISOString() });
    mockDb.salvar(db);
  },

  // ---------- Afiliados (8.3) ----------
  /** Links de busca com o parâmetro de afiliado de cada parceiro. */
  linksAfiliados(titulo, artista) {
    const termo = [artista && artista !== 'Vários Artistas' ? artista : '', titulo].filter(Boolean).join(' ');
    const q = encodeURIComponent(termo);
    const slug = termo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const urls = {
      mercadolivre: `https://lista.mercadolivre.com.br/${slug}-vinil`,
      amazon: `https://www.amazon.com.br/s?k=${q}`,
      discogs: `https://www.discogs.com/search/?q=${q}&type=all`,
    };
    return programasAfiliadosMock.map((p) => ({
      parceiro: p.parceiro,
      nome: p.nome,
      url: `${urls[p.parceiro]}${urls[p.parceiro].includes('?') ? '&' : '?'}${p.parametro_url}`,
    }));
  },

  registrarCliqueAfiliado(parceiro, referencia) {
    if (!USE_MOCK) return http('/afiliados/cliques', { method: 'POST', body: { parceiro, referencia } }).catch(() => {});
    const db = mockDb.ler();
    db.cliques_afiliados.push({ id: mockDb.proximoId(db.cliques_afiliados), id_usuario: eu(), parceiro, referencia, timestamp: new Date().toISOString() });
    mockDb.salvar(db);
  },
};
