import { useSyncExternalStore } from 'react';

/*
 * Tudo do "app instalável" (PWA) num lugar só, FORA do React:
 *  - registra o service worker (só no build de produção: em desenvolvimento
 *    o cache atrapalharia ver as mudanças na hora);
 *  - guarda o evento "beforeinstallprompt" (o convite de instalação do Chrome/Android);
 *  - avisa quando há versão nova esperando;
 *  - acompanha online/offline.
 *
 * Por que fora do React? O navegador dispara "beforeinstallprompt" logo no
 * carregamento, às vezes ANTES de qualquer componente existir. Se o ouvinte
 * estivesse num useEffect, perderíamos o evento.
 *
 * Os componentes leem esse estado com usePwa() — useSyncExternalStore é o
 * jeito oficial do React de "assinar" um estado que vive fora dele.
 */

let estado = {
  podeInstalar: false,
  instalado: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true),
  atualizacaoPronta: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};
let conviteInstalacao = null;
let swEsperando = null;
const ouvintes = new Set();

function mudar(parcial) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((fn) => fn());
}

const assinar = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

export const usePwa = () => useSyncExternalStore(assinar, () => estado, () => estado);

/** iPhone/iPad não têm "beforeinstallprompt": lá a instalação é manual (Compartilhar → Tela de Início). */
export const ehIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Mostra o convite nativo de instalação. Devolve true se a pessoa aceitou. */
export async function instalarApp() {
  if (!conviteInstalacao) return false;
  conviteInstalacao.prompt();
  const { outcome } = await conviteInstalacao.userChoice;
  conviteInstalacao = null; // o convite só pode ser usado uma vez
  mudar({ podeInstalar: false });
  return outcome === 'accepted';
}

/** Ativa a versão nova: o SW esperando assume e a página recarrega uma vez. */
export function aplicarAtualizacao() {
  if (!swEsperando) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  swEsperando.postMessage('PULAR_ESPERA');
}

function acompanharInstalacao(registro) {
  const marcar = (sw) => {
    swEsperando = sw;
    mudar({ atualizacaoPronta: true });
  };
  // Já havia uma versão nova esperando (ex.: aba ficou aberta de ontem)
  if (registro.waiting && navigator.serviceWorker.controller) marcar(registro.waiting);
  registro.addEventListener('updatefound', () => {
    const novo = registro.installing;
    novo?.addEventListener('statechange', () => {
      // "installed" + já existe um controlador = é atualização (não a primeira instalação)
      if (novo.state === 'installed' && navigator.serviceWorker.controller) marcar(novo);
    });
  });
}

export function iniciarPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // não mostra a barrinha automática; mostramos o nosso botão na hora certa
    conviteInstalacao = e;
    mudar({ podeInstalar: true });
  });
  window.addEventListener('appinstalled', () => mudar({ instalado: true, podeInstalar: false }));
  window.addEventListener('online', () => mudar({ online: true }));
  window.addEventListener('offline', () => mudar({ online: false }));

  if (import.meta.env.PROD && 'serviceWorker' in navigator && !window.Capacitor) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registro) => {
          acompanharInstalacao(registro);
          // Confere se há versão nova a cada hora (para quem deixa o app aberto o dia todo)
          setInterval(() => registro.update().catch(() => {}), 60 * 60 * 1000);
        })
        .catch(() => {
          /* sem SW o app funciona igual, só não fica offline */
        });
    });
  }
}
