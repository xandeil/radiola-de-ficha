import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { IDIOMAS, definirIdiomaAtual, detectarIdioma, salvarIdioma, traduzir } from '@/i18n';

/*
 * Guarda o idioma escolhido e entrega a função t() para os componentes.
 * Trocar o idioma muda o estado -> todo componente que usa useI18n() renderiza
 * de novo já no idioma novo, sem recarregar a página.
 */

const I18nContext = createContext(null);

const inicial = detectarIdioma();
definirIdiomaAtual(inicial);

export function I18nProvider({ children }) {
  const [idioma, setIdiomaEstado] = useState(inicial);

  const setIdioma = useCallback((codigo) => {
    if (!IDIOMAS.some((i) => i.codigo === codigo)) return;
    definirIdiomaAtual(codigo); // antes do setState: formatadores já usam o novo na próxima renderização
    salvarIdioma(codigo);
    setIdiomaEstado(codigo);
  }, []);

  const t = useCallback((chave, vars) => traduzir(idioma, chave, vars), [idioma]);

  const valor = useMemo(() => ({ idioma, setIdioma, t, idiomas: IDIOMAS }), [idioma, setIdioma, t]);
  return <I18nContext.Provider value={valor}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de <I18nProvider>');
  return ctx;
}

/** Atalho mais usado: const t = useT(); */
export const useT = () => useI18n().t;
