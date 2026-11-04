/*
 * npm run i18n:check
 *
 * Confere duas coisas que quebram traduções em silêncio:
 *  1. Chaves que existem em pt-BR mas faltam em en/es (ou sobram nelas).
 *  2. Chaves usadas no código com t('...') que não existem em pt-BR
 *     (erro de digitação: a tela mostraria "catalogo.titlo" em vez do texto).
 *
 * Chaves montadas em tempo de execução, como t(`dominio.tipo.${valor}`),
 * não dá para checar estaticamente — por isso o script só olha strings literais.
 * Sai com código 1 se achar problema (dá para usar no CI do GitHub).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = new URL('..', import.meta.url).pathname;
const carregar = async (nome) => (await import(pathToFileURL(join(raiz, 'src/i18n', `${nome}.js`)).href)).default;

function achatar(obj, prefixo = '', saida = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const chave = prefixo ? `${prefixo}.${k}` : k;
    if (v && typeof v === 'object') achatar(v, chave, saida);
    else saida.add(chave);
  }
  return saida;
}

const base = achatar(await carregar('pt-BR'));
let problemas = 0;

for (const idioma of ['en', 'es']) {
  const outro = achatar(await carregar(idioma));
  const faltam = [...base].filter((c) => !outro.has(c));
  const sobram = [...outro].filter((c) => !base.has(c));
  if (faltam.length) console.log(`\n[${idioma}] faltam ${faltam.length}:\n  ${faltam.join('\n  ')}`);
  if (sobram.length) console.log(`\n[${idioma}] sobram ${sobram.length}:\n  ${sobram.join('\n  ')}`);
  problemas += faltam.length + sobram.length;
}

// Varre o código procurando t('chave') / traduzir('chave')
const arquivos = [];
(function andar(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) andar(caminho);
    else if (/\.(jsx?|mjs)$/.test(nome) && !caminho.includes('/src/i18n/')) arquivos.push(caminho); // os exemplos dos comentários do i18n não contam
  }
})(join(raiz, 'src'));

const usadas = new Map();
const regex = /\b(?:t|tr|traduzir)\(\s*'([a-zA-Z][\w.]*)'/g;
for (const arquivo of arquivos) {
  const texto = readFileSync(arquivo, 'utf8');
  for (const [, chave] of texto.matchAll(regex)) {
    if (!usadas.has(chave)) usadas.set(chave, arquivo.replace(raiz, ''));
  }
}
// Chave com plural é usada sem o sufixo: t('x', { count }) procura x_one / x_other
const existe = (c) => base.has(c) || base.has(`${c}_one`) || base.has(`${c}_other`);
const inexistentes = [...usadas].filter(([c]) => !existe(c));
if (inexistentes.length) {
  console.log(`\nChaves usadas no código que não existem em pt-BR (${inexistentes.length}):`);
  inexistentes.forEach(([c, onde]) => console.log(`  ${c}  (${onde})`));
  problemas += inexistentes.length;
}

console.log(problemas ? `\n✖ ${problemas} problema(s).` : `✔ Tudo certo: ${base.size} chaves em 3 idiomas, ${usadas.size} usadas no código.`);
process.exit(problemas ? 1 : 0);
