import { t as traduzir } from '@/i18n';
/*
 * JSONP: um truque antigo, mas ainda necessário para APIs públicas que NÃO
 * mandam o cabeçalho CORS — caso da API do Deezer e da iTunes Search API.
 *
 * Em vez de fetch() (que o navegador bloquearia), criamos um <script src="...&callback=nome">.
 * O servidor responde "nome({...dados...})", o navegador executa e a função
 * global "nome" recebe os dados.
 *
 * ⚠️ JSONP executa o código que vem do servidor. Só use com APIs confiáveis
 * (Deezer e Apple são). Para qualquer outra coisa, prefira fetch + back-end.
 */
let contador = 0;

export function jsonp(url, { parametroCallback = 'callback', tempoLimite = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const nome = `__radiola_jsonp_${Date.now().toString(36)}_${contador++}`;
    const script = document.createElement('script');
    const separador = url.includes('?') ? '&' : '?';

    const limpar = () => {
      delete window[nome];
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      limpar();
      reject(Object.assign(new Error(traduzir('erros.demorou')), { status: 408 }));
    }, tempoLimite);

    window[nome] = (dados) => {
      limpar();
      resolve(dados);
    };
    script.src = `${url}${separador}${parametroCallback}=${nome}`;
    script.onerror = () => {
      limpar();
      reject(Object.assign(new Error(traduzir('erros.semConexaoStreaming')), { status: 0 }));
    };
    document.head.appendChild(script);
  });
}
