import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { spotifyService } from '@/services/streaming/spotifyService';

/*
 * Estado da conexão com serviços de streaming (por enquanto, só Spotify).
 * Fica separado do PlayerContext porque são responsabilidades diferentes:
 * este sabe "estou conectado?", o player sabe "o que está tocando?".
 * (Princípio da Responsabilidade Única — o "S" do SOLID.)
 */

const StreamingContext = createContext(null);
const FALLBACK_KEY = 'radiola.fallbackStreaming';

const lerFallback = () => {
  try {
    return localStorage.getItem(FALLBACK_KEY) !== '0'; // ligado por padrão
  } catch {
    return true;
  }
};

export function StreamingProvider({ children }) {
  const [conectado, setConectado] = useState(spotifyService.estaConectado());
  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState(null);
  const [fallback, setFallbackEstado] = useState(lerFallback);

  const carregarPerfil = useCallback(async () => {
    if (!spotifyService.estaConectado()) {
      setConectado(false);
      setPerfil(null);
      return;
    }
    try {
      setPerfil(await spotifyService.perfil());
      setConectado(true);
      setErro(null);
    } catch (e) {
      if (e.status === 401) {
        spotifyService.desconectar();
        setConectado(false);
      }
      setErro(e);
    }
  }, []);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const conectar = useCallback(async () => {
    setErro(null);
    try {
      const resultado = await spotifyService.conectar();
      if (resultado) await carregarPerfil(); // modo demo conecta na hora; o real redireciona
    } catch (e) {
      setErro(e);
    }
  }, [carregarPerfil]);

  const desconectar = useCallback(() => {
    spotifyService.desconectar();
    setConectado(false);
    setPerfil(null);
  }, []);

  const setFallback = useCallback((valor) => {
    setFallbackEstado(valor);
    try {
      localStorage.setItem(FALLBACK_KEY, valor ? '1' : '0');
    } catch {
      /* ignora */
    }
  }, []);

  const valor = useMemo(
    () => ({
      spotify: { conectado, perfil, modoDemo: spotifyService.modoDemo, premium: Boolean(perfil?.premium) },
      erro,
      fallback,
      setFallback,
      conectar,
      desconectar,
      recarregar: carregarPerfil,
    }),
    [conectado, perfil, erro, fallback, setFallback, conectar, desconectar, carregarPerfil],
  );

  return <StreamingContext.Provider value={valor}>{children}</StreamingContext.Provider>;
}

export function useStreaming() {
  const ctx = useContext(StreamingContext);
  if (!ctx) throw new Error('useStreaming precisa estar dentro de <StreamingProvider>');
  return ctx;
}
