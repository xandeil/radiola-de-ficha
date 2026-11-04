import ptBR from './pt-BR';
import en from './en';
import es from './es';

/*
 * Internacionalização (RNF020: português, inglês e espanhol).
 *
 * Por que não uma biblioteca (react-i18next)? Ela é ótima, mas o que precisamos
 * cabe em ~60 linhas e assim dá para ENTENDER como funciona por dentro:
 *
 *   t('menu.catalogo')                        -> "Catálogo" / "Collection" / "Colección"
 *   t('catalogo.total', { count: 3 })         -> escolhe "_one" ou "_other" (plural)
 *   t('saudacao', { nome: 'Ana' })            -> troca {{nome}} por "Ana"
 *
 * Se faltar a chave em inglês, cai no português; se faltar em tudo, mostra a
 * própria chave (fácil de achar na tela). `npm run i18n:check` lista o que falta.
 */

export const IDIOMAS = [
  { codigo: 'pt-BR', nome: 'Português', curto: 'PT' },
  { codigo: 'en', nome: 'English', curto: 'EN' },
  { codigo: 'es', nome: 'Español', curto: 'ES' },
];

export const PADRAO = 'pt-BR';
const DICIONARIOS = { 'pt-BR': ptBR, en, es };
const CHAVE = 'radiola.idioma';

// "Idioma atual" fora do React, para funções puras como formatarData() usarem.
let atual = PADRAO;
export const idiomaAtual = () => atual;
export const definirIdiomaAtual = (codigo) => {
  atual = DICIONARIOS[codigo] ? codigo : PADRAO;
  document.documentElement.lang = atual; // leitores de tela e o tradutor do navegador usam isto
};

/** Idioma inicial: o que a pessoa escolheu antes, senão o do navegador, senão português. */
export function detectarIdioma() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo && DICIONARIOS[salvo]) return salvo;
  } catch {
    /* sem storage */
  }
  const doNavegador = (navigator.languages || [navigator.language || '']).map((l) => l.toLowerCase());
  for (const l of doNavegador) {
    if (l.startsWith('pt')) return 'pt-BR';
    if (l.startsWith('es')) return 'es';
    if (l.startsWith('en')) return 'en';
  }
  return PADRAO;
}

export function salvarIdioma(codigo) {
  try {
    localStorage.setItem(CHAVE, codigo);
  } catch {
    /* sem storage: vale só nesta visita */
  }
}

/** Busca "a.b.c" dentro do objeto. */
const pegar = (obj, chave) => chave.split('.').reduce((o, parte) => (o == null ? undefined : o[parte]), obj);

const regrasPlural = {};
function sufixoPlural(idioma, n) {
  regrasPlural[idioma] ||= new Intl.PluralRules(idioma);
  return regrasPlural[idioma].select(n) === 'one' ? '_one' : '_other';
}

export function traduzir(idioma, chave, vars = {}) {
  const candidatos = typeof vars.count === 'number' ? [chave + sufixoPlural(idioma, vars.count), chave] : [chave];
  let texto;
  for (const dic of [DICIONARIOS[idioma], DICIONARIOS[PADRAO]]) {
    for (const c of candidatos) {
      texto = pegar(dic, c);
      if (typeof texto === 'string') break;
    }
    if (typeof texto === 'string') break;
  }
  if (typeof texto !== 'string') return chave;
  return texto.replace(/\{\{(\w+)\}\}/g, (_, nome) => (vars[nome] ?? `{{${nome}}}`));
}

/** Atalho para código fora de componentes (serviços, utilitários). */
export const t = (chave, vars) => traduzir(atual, chave, vars);

/** Tradução com valor padrão: útil para dados do sistema (nome de conquista, nível) com versão no dicionário. */
export function traduzirOu(chave, padrao, vars) {
  const texto = traduzir(atual, chave, vars);
  return texto === chave ? padrao : texto;
}
