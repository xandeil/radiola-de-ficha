import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { manutencaoService } from '@/services/manutencaoService';

/*
 * Estado do modo manutenção para o app inteiro (Anexo 2).
 *
 * - Consulta GET /status ao abrir e a cada 60s (o mesmo TTL do cache, RNF045).
 * - Também consulta quando a aba volta a ficar visível e quando qualquer
 *   chamada à API recebe 503 (evento 'radiola:manutencao', disparado no api.js).
 * - Escuta 'storage': se outra aba (ex.: o admin) mudar o banco mock, esta aba sabe.
 */

const ManutencaoContext = createContext(null);
const INTERVALO = 60 * 1000;

export function ManutencaoProvider({ children }) {
  const [status, setStatus] = useState(null);

  const atualizar = useCallback(async (forcar = false) => {
    try {
      setStatus(await manutencaoService.status(forcar));
    } catch {
      // Se nem o /status responde, não travamos o app: seguimos como "no ar"
      // e as telas mostram o próprio erro de rede.
      setStatus((s) => s || { em_manutencao: false });
    }
  }, []);

  useEffect(() => {
    atualizar();
    const timer = setInterval(() => atualizar(true), INTERVALO);
    const aoVoltar = () => document.visibilityState === 'visible' && atualizar(true);
    const forcar = () => atualizar(true);
    const aoMudarOutraAba = (e) => e.key === 'radiola.db' && atualizar(true);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('radiola:manutencao', forcar);
    window.addEventListener('storage', aoMudarOutraAba);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('radiola:manutencao', forcar);
      window.removeEventListener('storage', aoMudarOutraAba);
    };
  }, [atualizar]);

  return <ManutencaoContext.Provider value={{ status, atualizar }}>{children}</ManutencaoContext.Provider>;
}

export function useManutencao() {
  const ctx = useContext(ManutencaoContext);
  if (!ctx) throw new Error('useManutencao precisa estar dentro de <ManutencaoProvider>');
  return ctx;
}
