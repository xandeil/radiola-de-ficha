import { USE_MOCK, http, atraso, tokenStorage } from './api';
import { mockDb } from './mockDb';
import { conquistasMock, niveisMock } from '@/mocks/social';

/*
 * Gamificação (RF078–RF082): conquistas, pontos e nível de colecionador.
 *
 * Cada conquista tem "criterios" em JSON (como no banco). Em vez de um
 * if/else por conquista, há um MEDIDOR por tipo de critério que devolve
 * { atual, meta }. Conquista nova no banco com um critério que já existe
 * funciona sem escrever código.
 *
 * Quando uma conquista é atingida pela primeira vez, gravamos a data em
 * conquistas_usuarios e publicamos no feed. Assim ela não "some" se o
 * usuário apagar um disco depois — conquista é para sempre.
 */

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

const decada = (ano) => (ano ? Math.floor(ano / 10) * 10 : null);

function contexto(db, idUsuario) {
  const itens = db.itens.filter((i) => i.id_usuario === idUsuario);
  const resenhas = db.posts.filter((p) => p.id_usuario === idUsuario && p.tipo_post === 'resenha');
  const idsResenhas = new Set(resenhas.map((r) => r.id));
  return {
    itens,
    resenhas: resenhas.length,
    curtidasRecebidas: db.interacoes.filter((i) => i.tipo === 'curtir' && idsResenhas.has(i.id_post)).length,
    convites: db.convites.filter((c) => c.id_usuario === idUsuario).length,
  };
}

const distintos = (lista) => new Set(lista.filter(Boolean)).size;

const MEDIDORES = {
  itens: (c, meta) => ({ atual: c.itens.length, meta }),
  tipo: (c, tipo, criterios) => ({ atual: c.itens.filter((i) => i.tipo_midia === tipo).length, meta: criterios.quantidade }),
  generos: (c, meta) => ({ atual: distintos(c.itens.map((i) => i.genero)), meta }),
  paises: (c, meta) => ({ atual: distintos(c.itens.map((i) => i.pais_origem)), meta }),
  decadas: (c, meta) => ({ atual: distintos(c.itens.map((i) => decada(i.ano_lancamento || i.ano_gravacao))), meta }),
  formatos: (c, formatos) => ({ atual: formatos.filter((f) => c.itens.some((i) => i.tipo_midia === f)).length, meta: formatos.length }),
  convites: (c, meta) => ({ atual: c.convites, meta }),
  curtidas_recebidas: (c, meta) => ({ atual: c.curtidasRecebidas, meta }),
  resenhas: (c, meta) => ({ atual: c.resenhas, meta }),
};

function medir(conquista, ctx) {
  const [chave, valor] = Object.entries(conquista.criterios).find(([k]) => MEDIDORES[k]) || [];
  if (!chave) return { atual: 0, meta: 1 };
  return MEDIDORES[chave](ctx, valor, conquista.criterios);
}

export function nivelPorPontos(pontos) {
  const nivel = niveisMock.find((n) => pontos >= n.pontos_minimos && pontos <= n.pontos_maximos) || niveisMock[0];
  const proximo = niveisMock.find((n) => n.nivel === nivel.nivel + 1) || null;
  return { ...nivel, proximo };
}

function calcular(db, idUsuario, registrar) {
  const ctx = contexto(db, idUsuario);
  const novas = [];

  const lista = conquistasMock.map((c) => {
    const { atual, meta } = medir(c, ctx);
    let registro = db.conquistas_usuarios.find((r) => r.id_usuario === idUsuario && r.id_conquista === c.id);
    if (!registro && atual >= meta && registrar) {
      registro = { id_usuario: idUsuario, id_conquista: c.id, data_desbloqueio: new Date().toISOString() };
      db.conquistas_usuarios.push(registro);
      novas.push(c);
    }
    return { ...c, atual: Math.min(atual, meta), meta, desbloqueada: Boolean(registro), data_desbloqueio: registro?.data_desbloqueio || null };
  });

  const pontos = lista.filter((c) => c.desbloqueada).reduce((s, c) => s + c.pontos, 0);
  return { conquistas: lista, pontos, nivel: nivelPorPontos(pontos), novas };
}

export const conquistaService = {
  /**
   * Calcula o progresso do usuário logado e registra as conquistas novas.
   * Devolve { conquistas, pontos, nivel, novas } — "novas" serve para o toast.
   */
  async verificar() {
    if (!USE_MOCK) return http('/conquistas/verificar', { method: 'POST' });
    await atraso(150);
    const db = mockDb.ler();
    const meuId = eu();
    const resultado = calcular(db, meuId, true);
    if (resultado.novas.length) {
      resultado.novas.forEach((c) =>
        db.posts.push({
          id: mockDb.proximoId(db.posts),
          id_usuario: meuId,
          tipo_post: 'conquista',
          referencia: { titulo: c.nome, descricao: c.descricao, cor_capa: c.cor },
          visibilidade: 'amigos',
          data_publicacao: new Date().toISOString(),
        }),
      );
      mockDb.salvar(db);
    }
    return resultado;
  },

  /** Conquistas de outro usuário (para o perfil público) — só leitura. */
  async deUsuario(idUsuario) {
    if (!USE_MOCK) return http(`/usuarios/${idUsuario}/conquistas`);
    await atraso(150);
    const db = mockDb.ler();
    // Para os outros, vale o que dá para medir agora (eles não "logam" no mock)
    const resultado = calcular(db, idUsuario, false);
    resultado.conquistas = resultado.conquistas.map((c) => ({ ...c, desbloqueada: c.desbloqueada || c.atual >= c.meta }));
    resultado.pontos = resultado.conquistas.filter((c) => c.desbloqueada).reduce((s, c) => s + c.pontos, 0);
    resultado.nivel = nivelPorPontos(resultado.pontos);
    return resultado;
  },
};
