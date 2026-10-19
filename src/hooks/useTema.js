import { useEffect, useState } from 'react';

/*
 * Tema claro/escuro/automático (RNF019).
 * "auto" remove o atributo e deixa o @media (prefers-color-scheme) do CSS decidir.
 */
const CHAVE = 'radiola.tema';

function lerTema() {
  try {
    return localStorage.getItem(CHAVE) || 'auto';
  } catch {
    return 'auto';
  }
}

export function useTema() {
  const [tema, setTema] = useState(lerTema);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'auto') raiz.removeAttribute('data-theme');
    else raiz.setAttribute('data-theme', tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      /* navegação privada: só não persiste */
    }
  }, [tema]);

  const proximoTema = () => setTema((t) => ({ auto: 'light', light: 'dark', dark: 'auto' })[t]);

  return { tema, setTema, proximoTema };
}
