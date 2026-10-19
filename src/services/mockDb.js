import { itensMock, usuariosMock } from '@/mocks/dados';

/*
 * "Banco de dados" do modo mock, salvo no localStorage.
 * Assim o que você cadastra continua lá depois de recarregar a página.
 * Para zerar: abra o DevTools > Application > Local Storage e apague "radiola.db".
 */

const DB_KEY = 'radiola.db';
const VERSAO = 1; // aumente se mudar o formato dos mocks, para forçar recarga

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(DB_KEY));
    if (salvo?.versao === VERSAO) return salvo;
  } catch {
    /* JSON corrompido: recria abaixo */
  }
  const inicial = { versao: VERSAO, usuarios: usuariosMock, itens: itensMock };
  localStorage.setItem(DB_KEY, JSON.stringify(inicial));
  return inicial;
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
