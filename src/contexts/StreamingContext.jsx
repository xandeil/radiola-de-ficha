import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SERVICOS, servicoPorId } from '@/services/streaming/servicos';

/*
 * Estado das conexões com os serviços de streaming (Spotify, Deezer, Apple Music).
 * Fica separado do PlayerContext porque são responsabilidades diferentes:
 * este sabe "estou conectado em quê?", o player sabe "o que está tocando?".
 * (Princípio da Responsabilidade Única — o "S" do SOLID.)
 *
 * "ordem" é a preferência do usuário para o fallback (RF024): quando a faixa do
 * disco não tem arquivo, procuramos primeiro no 1º serviço da lista, depois no 2º...
 */

const StreamingContext = createContext(null);
const FALLBACK_KEY = 'radiola.fallbackStreaming';
const ORDEM_KEY = 'radiola.ordemStreaming';

const ler = (chave, padrao) => {
  try {
    const v = localStorage.getItem(chave);
    return v == null ? padrao : JSON.parse(v);
  } catch {
    return padrao;
  }
};
const gravar = (chave, valor) => {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem storage */
  }
};

const estadoInicial = () => Object.fromEntries(SERVICOS.map((s) => [s.id, { conectado: s.estaConectado(), perfil: null, erro: null }]));

export function StreamingProvider({ children }) {
  const [estados, setEstados] = useState(estadoInicial);
  const [erro, setErro] = useState(null); // último erro de conexão (qualquer serviço)
  const [fallback, setFallbackEstado] = useState(() => ler(FALLBACK_KEY, true) !== false && ler(FALLBACK_KEY, true) !== 0);
  const [ordem, setOrdemEstado] = useState(() => {
    const salva = ler(ORDEM_KEY, null);
    const ids = SERVICOS.map((s) => s.id);
    return Array.isArray(salva) ? [...salva.filter((id) => ids.includes(id)), ...ids.filter((id) => !salva.includes(id))] : ids;
  });

  const atualizar = (id, parcial) => setEstados((e) => ({ ...e, [id]: { ...e[id], ...parcial } }));

  const carregarPerfil = useCallback(async (id) => {
    const s = servicoPorId(id);
    if (!s.estaConectado()) {
      atualizar(id, { conectado: false, perfil: null });
      return;
    }
    try {
      atualizar(id, { conectado: true, perfil: await s.perfil(), erro: null });
    } catch (e) {
      if (e.status === 401) {
        await s.desconectar();
        atualizar(id, { conectado: false, perfil: null });
      }
      atualizar(id, { erro: e });
    }
  }, []);

  const recarregar = useCallback(() => Promise.all(SERVICOS.map((s) => carregarPerfil(s.id))), [carregarPerfil]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** conectar() sem argumento = Spotify (compatível com as fases anteriores). */
  const conectar = useCallback(
    async (id = 'spotify') => {
      setErro(null);
      try {
        const resultado = await servicoPorId(id).conectar();
        if (resultado) await carregarPerfil(id); // modos demo/público conectam na hora; OAuth redireciona
      } catch (e) {
        setErro(Object.assign(e, { servico: id }));
      }
    },
    [carregarPerfil],
  );

  const desconectar = useCallback(async (id = 'spotify') => {
    await servicoPorId(id).desconectar();
    atualizar(id, { conectado: false, perfil: null, erro: null });
  }, []);

  const setFallback = useCallback((valor) => {
    setFallbackEstado(valor);
    gravar(FALLBACK_KEY, valor);
  }, []);

  /** Move um serviço uma posição para cima (-1) ou para baixo (+1) na preferência. */
  const moverNaOrdem = useCallback((id, direcao) => {
    setOrdemEstado((atual) => {
      const i = atual.indexOf(id);
      const j = i + direcao;
      if (j < 0 || j >= atual.length) return atual;
      const nova = [...atual];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      gravar(ORDEM_KEY, nova);
      return nova;
    });
  }, []);

  const valor = useMemo(() => {
    const servicos = ordem.map((id) => {
      const s = servicoPorId(id);
      return { id, nome: s.nome, cor: s.cor, modo: s.modo(), modoDemo: s.modoDemo, ...estados[id] };
    });
    const sp = estados.spotify;
    return {
      servicos, // na ordem de preferência
      conectados: servicos.filter((s) => s.conectado),
      // atalho usado pelo player (Web Playback SDK) e por telas antigas
      spotify: { ...sp, modoDemo: servicoPorId('spotify').modoDemo, premium: Boolean(sp.perfil?.premium) },
      apple: estados.apple,
      erro,
      fallback,
      setFallback,
      ordem,
      moverNaOrdem,
      conectar,
      desconectar,
      recarregar,
    };
  }, [estados, erro, fallback, setFallback, ordem, moverNaOrdem, conectar, desconectar, recarregar]);

  return <StreamingContext.Provider value={valor}>{children}</StreamingContext.Provider>;
}

export function useStreaming() {
  const ctx = useContext(StreamingContext);
  if (!ctx) throw new Error('useStreaming precisa estar dentro de <StreamingProvider>');
  return ctx;
}
