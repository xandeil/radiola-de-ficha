import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/*
 * O "motor" da Radiola (RF019, RF025, RF026).
 *
 * Fica num Context porque o som precisa continuar tocando quando você
 * navega entre páginas — o mini player do rodapé e a página da vitrola
 * leem o MESMO estado.
 *
 * Duas fontes de áudio:
 *  1. Faixa com arquivo vinculado -> toca de verdade com <audio>.
 *  2. Faixa sem arquivo -> "modo demonstração": o progresso anda com um
 *     timer, para você ver a vitrola funcionando sem ter MP3 nenhum.
 *     (Na Fase 2 entra o Spotify como terceira fonte.)
 */

const PlayerContext = createContext(null);

/** Monta a entrada da fila juntando a faixa com os dados do disco. */
const paraFila = (item, faixa) => ({
  ...faixa,
  chave: `${item.id}-${faixa.id}`,
  item: {
    id: item.id,
    titulo: item.titulo,
    artista: item.artista,
    tipo_midia: item.tipo_midia,
    cor_capa: item.cor_capa,
  },
});

export function PlayerProvider({ children }) {
  const [fila, setFila] = useState([]);
  const [indice, setIndice] = useState(-1);
  const [tocando, setTocando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [aleatorio, setAleatorio] = useState(false);
  const [repetir, setRepetir] = useState('off'); // 'off' | 'todas' | 'uma'
  // Arquivos escolhidos pelo usuário nesta sessão: { [faixaId]: blobUrl }
  const [arquivos, setArquivos] = useState({});

  const audioRef = useRef(null);
  if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();

  const atual = fila[indice] || null;
  const urlAtual = atual ? arquivos[atual.id] || atual.arquivo_audio : null;
  const duracao = atual?.duracao_segundos || 0;

  // ---------- navegação na fila ----------
  const proxima = useCallback(
    (automatico = false) => {
      if (!fila.length) return;
      if (automatico && repetir === 'uma') {
        setProgresso(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
        return;
      }
      let novo;
      if (aleatorio && fila.length > 1) {
        do novo = Math.floor(Math.random() * fila.length);
        while (novo === indice);
      } else {
        novo = indice + 1;
      }
      if (novo >= fila.length) {
        if (repetir === 'todas') novo = 0;
        else {
          setTocando(false);
          setProgresso(0);
          return;
        }
      }
      setIndice(novo);
      setProgresso(0);
    },
    [fila.length, indice, aleatorio, repetir],
  );

  const anterior = useCallback(() => {
    // Comportamento padrão de players: se já passou de 3s, volta ao início da faixa
    if (progresso > 3 || indice <= 0) {
      setProgresso(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    setIndice((i) => i - 1);
    setProgresso(0);
  }, [progresso, indice]);

  // ---------- áudio real ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (urlAtual) {
      if (audio.src !== urlAtual) audio.src = urlAtual;
    } else {
      audio.pause();
      audio.removeAttribute('src');
    }
  }, [urlAtual]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !urlAtual) return;
    if (tocando) audio.play().catch(() => setTocando(false));
    else audio.pause();
  }, [tocando, urlAtual]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const aoAtualizar = () => setProgresso(audio.currentTime);
    const aoTerminar = () => proxima(true);
    audio.addEventListener('timeupdate', aoAtualizar);
    audio.addEventListener('ended', aoTerminar);
    return () => {
      audio.removeEventListener('timeupdate', aoAtualizar);
      audio.removeEventListener('ended', aoTerminar);
    };
  }, [proxima]);

  // ---------- modo demonstração (sem arquivo) ----------
  useEffect(() => {
    if (!tocando || urlAtual || !atual) return;
    const passo = 0.25;
    const timer = setInterval(() => setProgresso((p) => p + passo), passo * 1000);
    return () => clearInterval(timer); // limpeza: sem isso o timer vaza ao trocar de faixa
  }, [tocando, urlAtual, atual]);

  useEffect(() => {
    if (!urlAtual && duracao && progresso >= duracao) proxima(true);
  }, [progresso, duracao, urlAtual, proxima]);

  // ---------- ações públicas ----------
  const tocarItem = useCallback((item, aPartirDe = 0) => {
    const faixas = (item.faixas || []).map((f) => paraFila(item, f));
    if (!faixas.length) return false;
    setFila(faixas);
    setIndice(Math.min(aPartirDe, faixas.length - 1));
    setProgresso(0);
    setTocando(true);
    return true;
  }, []);

  const adicionarNaFila = useCallback(
    (item, faixa) => {
      setFila((f) => [...f, paraFila(item, faixa)]);
      if (indice === -1) setIndice(0);
    },
    [indice],
  );

  const removerDaFila = useCallback(
    (posicao) => {
      setFila((f) => f.filter((_, i) => i !== posicao));
      if (posicao < indice) setIndice((i) => i - 1);
      else if (posicao === indice) setProgresso(0);
    },
    [indice],
  );

  const moverNaFila = useCallback(
    (de, para) => {
      setFila((f) => {
        if (para < 0 || para >= f.length) return f;
        const copia = [...f];
        const [movido] = copia.splice(de, 1);
        copia.splice(para, 0, movido);
        return copia;
      });
      if (de === indice) setIndice(para);
      else if (de < indice && para >= indice) setIndice((i) => i - 1);
      else if (de > indice && para <= indice) setIndice((i) => i + 1);
    },
    [indice],
  );

  const irPara = useCallback((posicao) => {
    setIndice(posicao);
    setProgresso(0);
    setTocando(true);
  }, []);

  const buscar = useCallback(
    (segundos) => {
      const alvo = Math.max(0, Math.min(segundos, duracao));
      setProgresso(alvo);
      if (audioRef.current && urlAtual) audioRef.current.currentTime = alvo;
    },
    [duracao, urlAtual],
  );

  const vincularArquivo = useCallback((faixaId, arquivo) => {
    setArquivos((a) => {
      if (a[faixaId]) URL.revokeObjectURL(a[faixaId]);
      return { ...a, [faixaId]: URL.createObjectURL(arquivo) };
    });
  }, []);

  const valor = useMemo(
    () => ({
      fila,
      indice,
      atual,
      tocando,
      progresso,
      duracao,
      volume,
      aleatorio,
      repetir,
      arquivos,
      temAudioReal: !!urlAtual,
      tocarItem,
      adicionarNaFila,
      removerDaFila,
      moverNaFila,
      irPara,
      buscar,
      vincularArquivo,
      alternar: () => atual && setTocando((t) => !t),
      proxima: () => proxima(false),
      anterior,
      setVolume,
      alternarAleatorio: () => setAleatorio((a) => !a),
      alternarRepetir: () => setRepetir((r) => ({ off: 'todas', todas: 'uma', uma: 'off' })[r]),
    }),
    [fila, indice, atual, tocando, progresso, duracao, volume, aleatorio, repetir, arquivos, urlAtual,
      tocarItem, adicionarNaFila, removerDaFila, moverNaFila, irPara, buscar, vincularArquivo, proxima, anterior],
  );

  return <PlayerContext.Provider value={valor}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}
