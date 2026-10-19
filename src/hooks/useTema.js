import { useEffect, useState } from 'react';

/*
 * Tema claro/escuro/automático (RNF019).
 * "auto" remove o atributo e deixa o @media (prefers-color-scheme) do CSS decidir.
 *
 * O menu lateral e a página de configurações usam este hook ao mesmo tempo.
 * Um evento no window mantém os dois sincronizados quando um deles muda o tema.
 */
const CHAVE = 'radiola.tema';
const EVENTO = 'radiola:tema';

function lerTema() {
  try {
    return localStorage.getItem(CHAVE) || 'auto';
  } catch {
    return 'auto';
  }
}

function aplicar(tema) {
  const raiz = document.documentElement;
  if (tema === 'auto') raiz.removeAttribute('data-theme');
  else raiz.setAttribute('data-theme', tema);
}

export function useTema() {
  const [tema, setTemaEstado] = useState(lerTema);

  useEffect(() => {
    aplicar(lerTema());
    const aoMudar = () => setTemaEstado(lerTema());
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  const setTema = (novo) => {
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      /* navegação privada: só não persiste */
    }
    aplicar(novo);
    window.dispatchEvent(new Event(EVENTO));
  };

  const proximoTema = () => setTema({ auto: 'light', light: 'dark', dark: 'auto' }[tema]);

  return { tema, setTema, proximoTema };
}
