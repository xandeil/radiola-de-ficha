/*
 * Service Worker da Radiola de Ficha (Fase 6 – app mobile / RF093 modo offline).
 *
 * O que é: um script que o navegador roda "por fora" da página, entre o app e
 * a internet. Ele intercepta cada requisição (evento fetch) e decide de onde
 * a resposta vem: da rede ou do cache.
 *
 * Estratégias usadas (cada tipo de arquivo tem a sua):
 *  - Navegação (abrir /catalogo, /player...): REDE PRIMEIRO, com o index.html
 *    do cache como reserva. Assim o app abre mesmo sem internet.
 *  - /assets/* (JS e CSS do build): CACHE PRIMEIRO. O Vite põe um hash no nome
 *    (index-BKZFv0vI.js); se o conteúdo muda, o nome muda — então o que está
 *    no cache nunca fica "velho".
 *  - Ícones e fontes: usa o cache e atualiza em segundo plano.
 *  - API, Mercado Pago, Spotify, Deezer...: NUNCA passa pelo cache aqui.
 *    Dado pessoal e pagamento não devem ficar guardados pelo service worker.
 *
 * Atualização: ao publicar um build novo, este arquivo muda (VERSAO), o navegador
 * instala o SW novo e ele fica "esperando". O app mostra "Nova versão disponível"
 * e, quando a pessoa clica, mandamos a mensagem PULAR_ESPERA.
 */

const VERSAO = 'radiola-v6.0.0';
const CACHE_APP = `${VERSAO}-app`;
const CACHE_ESTATICOS = `${VERSAO}-estaticos`;
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icones/icone-192.png', '/icones/icone-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_APP).then((cache) => cache.addAll(PRECACHE)));
  // Sem skipWaiting() aqui de propósito: quem decide a hora de trocar é o usuário.
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('radiola-') && !n.startsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'PULAR_ESPERA') self.skipWaiting();
});

const ehFonte = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return; // POST/PUT/DELETE sempre vão direto para a rede
  const url = new URL(request.url);

  // 1. Abrir uma tela do app
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_APP).then((cache) => cache.put('/index.html', copia));
          return resposta;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // 2. JS/CSS com hash no nome
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(request).then(
        (doCache) =>
          doCache ||
          fetch(request).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE_ESTATICOS).then((cache) => cache.put(request, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  // 3. Ícones do próprio site e fontes do Google: cache + atualiza por trás ("stale-while-revalidate")
  if ((url.origin === self.location.origin && url.pathname.startsWith('/icones/')) || ehFonte(url)) {
    evento.respondWith(
      caches.open(CACHE_ESTATICOS).then((cache) =>
        cache.match(request).then((doCache) => {
          const daRede = fetch(request)
            .then((resposta) => {
              if (resposta.ok || resposta.type === 'opaque') cache.put(request, resposta.clone());
              return resposta;
            })
            .catch(() => doCache);
          return doCache || daRede;
        }),
      ),
    );
  }
  // 4. Todo o resto (API, streaming, pagamento): o navegador segue normal, sem cache do SW.
});
