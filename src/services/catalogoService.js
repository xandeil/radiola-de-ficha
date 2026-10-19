import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';

/*
 * CRUD do catálogo (RF001–RF011) + exportação.
 *
 * Repare no "id_usuario": no mock nós filtramos por ele em TODA consulta.
 * É o que o documento chama de Row-Level Security (RNF032). No back real
 * quem faz isso é o PHP, mas é bom o front já nascer com essa mentalidade.
 */

const idUsuarioLogado = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

function aplicarFiltros(itens, { busca = '', tipo = '', local = '', ordem = 'recentes' }) {
  const termo = busca.trim().toLowerCase();

  const filtrados = itens.filter((item) => {
    const bateBusca =
      !termo ||
      item.titulo.toLowerCase().includes(termo) ||
      (item.artista || '').toLowerCase().includes(termo) ||
      (item.notas_pessoais || '').toLowerCase().includes(termo);
    const bateTipo = !tipo || item.tipo_midia === tipo;
    const bateLocal = !local || item.localizacao?.local_principal === local;
    return bateBusca && bateTipo && bateLocal;
  });

  const ordenadores = {
    recentes: (a, b) => b.data_cadastro.localeCompare(a.data_cadastro),
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
    artista: (a, b) => (a.artista || '').localeCompare(b.artista || '', 'pt-BR'),
    ano: (a, b) => (a.ano_lancamento || a.ano_gravacao || 0) - (b.ano_lancamento || b.ano_gravacao || 0),
  };
  return [...filtrados].sort(ordenadores[ordem] || ordenadores.recentes);
}

export const catalogoService = {
  async listar(filtros = {}) {
    if (!USE_MOCK) return http(`/itens?${new URLSearchParams(filtros)}`);
    await atraso();
    const meus = mockDb.ler().itens.filter((i) => i.id_usuario === idUsuarioLogado());
    return aplicarFiltros(meus, filtros);
  },

  async buscarPorId(id) {
    if (!USE_MOCK) return http(`/itens/${id}`);
    await atraso();
    const item = mockDb.ler().itens.find((i) => i.id === Number(id) && i.id_usuario === idUsuarioLogado());
    if (!item) throw new ApiError('Item não encontrado', 404);
    return item;
  },

  async criar(dados) {
    if (!USE_MOCK) return http('/itens', { method: 'POST', body: dados });
    await atraso();
    const db = mockDb.ler();
    const novo = {
      ...dados,
      id: mockDb.proximoId(db.itens),
      id_usuario: idUsuarioLogado(),
      data_cadastro: new Date().toISOString(),
      faixas: (dados.faixas || []).map((f, i) => ({ ...f, id: Date.now() + i })),
    };
    db.itens.push(novo);
    // RF068 – "Fulano adicionou disco X" no feed dos amigos (só se o item for público)
    if (novo.publico && db.posts) {
      db.posts.push({
        id: mockDb.proximoId(db.posts),
        id_usuario: novo.id_usuario,
        tipo_post: 'adicionou',
        id_item: novo.id,
        referencia: { titulo: novo.titulo, artista: novo.artista, formato: novo.tipo_midia, cor_capa: novo.cor_capa },
        visibilidade: 'amigos',
        data_publicacao: novo.data_cadastro,
      });
    }
    mockDb.salvar(db);
    return novo;
  },

  async atualizar(id, dados) {
    if (!USE_MOCK) return http(`/itens/${id}`, { method: 'PUT', body: dados });
    await atraso();
    const db = mockDb.ler();
    const indice = db.itens.findIndex((i) => i.id === Number(id) && i.id_usuario === idUsuarioLogado());
    if (indice === -1) throw new ApiError('Item não encontrado', 404);

    const anterior = db.itens[indice];
    const mudouLocal =
      JSON.stringify({ ...anterior.localizacao, data_movimentacao: null }) !==
      JSON.stringify({ ...dados.localizacao, data_movimentacao: null });

    db.itens[indice] = {
      ...anterior,
      ...dados,
      id: anterior.id,
      id_usuario: anterior.id_usuario,
      localizacao: {
        ...dados.localizacao,
        // RF003: registra a data da última movimentação quando o lugar muda
        data_movimentacao: mudouLocal ? new Date().toISOString() : anterior.localizacao?.data_movimentacao,
      },
      faixas: (dados.faixas || []).map((f, i) => ({ ...f, id: f.id || Date.now() + i })),
      data_atualizacao: new Date().toISOString(),
    };
    mockDb.salvar(db);
    return db.itens[indice];
  },

  async excluir(id) {
    if (!USE_MOCK) return http(`/itens/${id}`, { method: 'DELETE' });
    await atraso();
    const db = mockDb.ler();
    db.itens = db.itens.filter((i) => !(i.id === Number(id) && i.id_usuario === idUsuarioLogado()));
    mockDb.salvar(db);
    return { ok: true };
  },

  /**
   * RF041 – Anotações pessoais do encarte (memórias, histórias).
   * idFaixa null = anotação do disco inteiro. No banco: tabela anotacoes_pessoais.
   */
  async salvarAnotacao(idItem, idFaixa, texto) {
    if (!USE_MOCK) {
      return http(`/itens/${idItem}/anotacoes`, { method: 'PUT', body: { id_faixa: idFaixa, conteudo: texto } });
    }
    await atraso(200);
    const db = mockDb.ler();
    const item = db.itens.find((i) => i.id === Number(idItem) && i.id_usuario === idUsuarioLogado());
    if (!item) throw new ApiError('Item não encontrado', 404);
    item.anotacoes = item.anotacoes || { item: '', faixas: {} };
    if (idFaixa) item.anotacoes.faixas[idFaixa] = texto;
    else item.anotacoes.item = texto;
    mockDb.salvar(db);
    return item.anotacoes;
  },

  /** Lista os locais já usados, para sugerir no formulário e filtrar no catálogo. */
  async locais() {
    const itens = await this.listar();
    return [...new Set(itens.map((i) => i.localizacao?.local_principal).filter(Boolean))].sort();
  },
};
