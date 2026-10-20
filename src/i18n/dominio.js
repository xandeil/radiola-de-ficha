import { t as traduzir, traduzirOu } from './index';
import { ORDENACOES, TIPOS_MIDIA } from '@/utils/constantes';
import ptBR from './pt-BR';

/*
 * Valores de domínio (ENUMs do banco) x rótulos na tela.
 *
 * O VALOR gravado no banco nunca muda de idioma: 'Ótimo' continua 'Ótimo'
 * no MySQL, senão filtros e relatórios quebrariam. Só o RÓTULO exibido é
 * traduzido. Se não houver tradução (ex.: um gênero digitado pelo usuário),
 * mostramos o próprio valor.
 */
export function rotuloDominio(grupo, valor) {
  if (valor == null || valor === '') return valor;
  const chave = `dominio.${grupo}.${valor}`;
  const texto = traduzir(chave);
  return texto === chave ? valor : texto;
}

/** Lista de opções {valor, rotulo} para os <Selecao>, já no idioma atual. */
export const opcoesDominio = (grupo, valores) => valores.map((v) => ({ valor: v, rotulo: rotuloDominio(grupo, v) }));

export const opcoesTiposMidia = () => TIPOS_MIDIA.map((tipo) => ({ valor: tipo.valor, rotulo: rotuloDominio('tipo', tipo.valor) }));
export const opcoesOrdenacao = () => ORDENACOES.map((o) => ({ valor: o.valor, rotulo: rotuloDominio('ordem', o.valor) }));

/* Conquistas e níveis: dados do sistema com versão no dicionário (chave pelo id). */
export const nomeConquista = (c) => traduzirOu(`social.def.${c.id}.nome`, c.nome);
export const descricaoConquista = (c) => traduzirOu(`social.def.${c.id}.descricao`, c.descricao);
export const nomeNivel = (n) => (n ? traduzirOu(`social.nivel.${n.nivel}`, n.nome) : '');

/**
 * Post antigo de conquista guarda só o NOME em português (referencia.titulo).
 * Achamos o id pelo nome no dicionário pt-BR e traduzimos. Posts novos
 * já levam referencia.id_conquista, que é o caminho certo.
 */
export function conquistaDoPost(ref) {
  const id = ref.id_conquista ?? Object.entries(ptBR.social.def).find(([, d]) => d.nome === ref.titulo)?.[0];
  return id ? { nome: nomeConquista({ id, nome: ref.titulo }), descricao: descricaoConquista({ id, descricao: ref.descricao }) } : { nome: ref.titulo, descricao: ref.descricao };
}
