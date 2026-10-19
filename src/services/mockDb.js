import { itensMock, usuariosMock } from '@/mocks/dados';
import {
  amizadesMock,
  generosItensDemo,
  gruposMock,
  interacoesMock,
  itensOutrosMock,
  membrosGrupoMock,
  outrosUsuariosMock,
  postsGrupoMock,
  postsMock,
} from '@/mocks/social';

/*
 * "Banco de dados" do modo mock, salvo no localStorage.
 * Assim o que você cadastra continua lá depois de recarregar a página.
 * Para zerar: abra o DevTools > Application > Local Storage e apague "radiola.db".
 *
 * MIGRAÇÕES: quando o formato muda (ex.: a Fase 3 trouxe tabelas sociais),
 * não apagamos o que você já cadastrou. Cada versão tem uma função que
 * transforma o banco da versão anterior na nova — igual migrations de
 * Laravel/Rails num back-end de verdade.
 */

const DB_KEY = 'radiola.db';
const VERSAO = 2;

const MIGRACOES = {
  // v1 -> v2: Fase 3 (rede social, gênero nos itens)
  2(db) {
    const idsUsuarios = new Set(db.usuarios.map((u) => u.id));
    db.usuarios.push(...outrosUsuariosMock.filter((u) => !idsUsuarios.has(u.id)));
    db.usuarios.forEach((u) => {
      if (!u.apelido) u.apelido = `colecionador${u.id}`;
    });

    db.itens.forEach((i) => {
      if (!i.genero && generosItensDemo[i.id] && i.id_usuario === 1) i.genero = generosItensDemo[i.id];
    });
    const idsItens = new Set(db.itens.map((i) => i.id));
    db.itens.push(...itensOutrosMock.filter((i) => !idsItens.has(i.id)));

    db.amizades = db.amizades || amizadesMock;
    db.posts = db.posts || postsMock;
    db.interacoes = db.interacoes || interacoesMock;
    db.grupos = db.grupos || gruposMock;
    db.membros_grupo = db.membros_grupo || membrosGrupoMock;
    db.posts_grupo = db.posts_grupo || postsGrupoMock;
    db.conquistas_usuarios = db.conquistas_usuarios || [];
    db.convites = db.convites || [];
    return db;
  },
};

function migrar(db) {
  for (let v = (db.versao || 1) + 1; v <= VERSAO; v++) {
    db = MIGRACOES[v](db);
    db.versao = v;
  }
  return db;
}

function carregar() {
  let db;
  try {
    db = JSON.parse(localStorage.getItem(DB_KEY));
  } catch {
    db = null; // JSON corrompido: recria abaixo
  }
  if (!db) db = { versao: 1, usuarios: structuredClone(usuariosMock), itens: structuredClone(itensMock) };
  if (db.versao !== VERSAO) {
    db = migrar(db);
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
  return db;
}

export const mockDb = {
  ler() {
    return carregar();
  },
  salvar(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  },
  proximoId(lista) {
    return lista.reduce((maior, x) => Math.max(maior, x.id), 0) + 1;
  },
};
