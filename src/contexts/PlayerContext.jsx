import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStreaming } from './StreamingContext';
import { spotifyService } from '@/services/streaming/spotifyService';
import { criarPlayerSpotify } from '@/services/streaming/spotifyPlayer';

/*
 * O "motor" da Radiola (RF019, RF021, RF024, RF025, RF026).
 *
 * A fila mistura faixas de duas FONTES:
 *  - 'local'   -> faixa de um disco do seu catálogo
 *  - 'spotify' -> faixa achada na busca do Spotify
 *
 * E cada faixa toca por um de três MOTORES:
 *  - 'audio'   -> há arquivo vinculado: toca com <audio> do navegador
 *  - 'spotify' -> Spotify real conectado e Premium: toca pelo Web Playback SDK
 *  - 'demo'    -> nenhum dos dois: o tempo anda com um timer (sem som)
 *
 * Fallback automático (RF024): faixa local sem arquivo + Spotify conectado
 * -> procuramos a mesma música no Spotify e tocamos de lá.
 *
 * As páginas não sabem nada de motores: elas só chamam tocar/pausar/próxima.
 * Toda a decisão fica aqui dentro (encapsulamento).
 */

const PlayerContext = createContext(null);

/** Entrada da fila para uma faixa do catálogo. */
const paraFila = (item, faixa) => ({
  ...faixa,
  fonte: 'local',
  chave: `local-${item.id}-${faixa.id}`,
  item: {
    id: item.id,
    titulo: item.titulo,
    artista: item.artista,
    tipo_midia: item.tipo_midia,
    cor_capa: item.cor_capa,
    capa_imagem: item.capa_imagem,
    velocidade: item.velocidade,
  },
});

/** Entrada da fila para uma faixa do Spotify. */
const paraFilaSpotify = (faixa) => ({
  id: faixa.id,
  fonte: 'spotify',
  chave: `spotify-${faixa.id}`,
  titulo: faixa.titulo,
  duracao_segundos: faixa.duracao_segundos,
  uri: faixa.uri,
  link: faixa.link,
  item: {
    id: null,
    titulo: faixa.album,
    artista: faixa.artista,
    tipo_midia: 'Spotify',
    cor_capa: faixa.cor_capa || '#1f7a4d',
    capa_imagem: faixa.capa_imagem,
  },
});

export function PlayerProvider({ children }) {
  const { spotify, fallback } = useStreaming();

  const [fila, setFila] = useState([]);
  const [indice, setIndice] = useState(-1);
  const [tocando, setTocando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [aleatorio, setAleatorio] = useState(false);
  const [repetir, setRepetir] = useState('off'); // 'off' | 'todas' | 'uma'
  const [arquivos, setArquivos] = useState({}); // { [faixaId]: blobUrl } desta sessão
  const [resolvidos, setResolvidos] = useState({}); // fallback: { [chave]: faixaSpotify | null }
  const [aviso, setAviso] = useState(null);
  const [falhaSpotify, setFalhaSpotify] = useState(false);
  const [duracaoReal, setDuracaoReal] = useState(null);

  const audioRef = useRef(null);
  if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();
  const spotifyRef = useRef({ player: null, deviceId: null, uriCarregada: null });

  const atual = fila[indice] || null;

  // ---------- qual motor toca a faixa atual? ----------
  const urlAudio = atual?.fonte === 'local' ? arquivos[atual.id] || atual.arquivo_audio : null;
  const faixaFallback = atual ? resolvidos[atual.chave] : undefined;
  const precisaFallback = atual?.fonte === 'local' && !urlAudio && fallback && spotify.conectado;
  const uriSpotify = atual?.fonte === 'spotify' ? atual.uri : precisaFallback ? faixaFallback?.uri : null;
  const resolvendo = precisaFallback && faixaFallback === undefined;
  const spotifyReal = spotify.conectado && !spotify.modoDemo && spotify.premium && !falhaSpotify;

  let motor = 'demo';
  if (urlAudio) motor = 'audio';
  else if (resolvendo) motor = 'aguardando';
  else if (uriSpotify && spotifyReal) motor = 'spotify';

  const viaSpotify = Boolean(uriSpotify); // tocando "do Spotify", mesmo que em modo demo
  // Conta Free não toca no navegador: oferecemos abrir a faixa no app do Spotify
  const linkSpotify = viaSpotify ? (atual.fonte === 'spotify' ? atual.link : faixaFallback?.link) : null;
  const precisaPremium = viaSpotify && spotify.conectado && !spotify.modoDemo && !spotify.premium;
  const duracao = (motor === 'spotify' && duracaoReal) || faixaFallback?.duracao_segundos || atual?.duracao_segundos || 0;

  // ---------- navegação na fila ----------
  const proxima = useCallback(
    (automatico = false) => {
      if (!fila.length) return;
      if (automatico && repetir === 'uma') {
        setProgresso(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
        spotifyRef.current.player?.seek(0);
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

  // Ref sempre com a versão mais nova de proxima, para callbacks registrados uma única vez (SDK)
  const proximaRef = useRef(proxima);
  proximaRef.current = proxima;
  const tocandoRef = useRef(tocando);
  tocandoRef.current = tocando;

  const anterior = useCallback(() => {
    // Padrão de players: se já passou de 3s, volta ao início da faixa
    if (progresso > 3 || indice <= 0) {
      setProgresso(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      spotifyRef.current.player?.seek(0);
      return;
    }
    setIndice((i) => i - 1);
    setProgresso(0);
  }, [progresso, indice]);

  // Ao trocar de faixa, zera avisos e a duração vinda do SDK
  useEffect(() => {
    setAviso(null);
    setDuracaoReal(null);
  }, [atual?.chave]);

  // ---------- fallback: procurar no Spotify ----------
  useEffect(() => {
    if (!resolvendo) return;
    let cancelado = false;
    const chave = atual.chave;
    spotifyService
      .encontrarFaixa(atual.titulo, atual.item.artista)
      .catch(() => null)
      .then((achada) => {
        if (cancelado) return;
        setResolvidos((r) => ({ ...r, [chave]: achada }));
        if (achada) setAviso(`Tocando pelo Spotify: ${achada.titulo} — ${achada.artista}`);
      });
    return () => {
      cancelado = true;
    };
  }, [resolvendo, atual]);

  // ---------- motor: <audio> ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (motor === 'audio') {
      if (audio.src !== urlAudio) audio.src = urlAudio;
    } else {
      audio.pause();
      audio.removeAttribute('src');
    }
  }, [motor, urlAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || motor !== 'audio') return;
    if (tocando) audio.play().catch(() => setTocando(false));
    else audio.pause();
  }, [tocando, motor, urlAudio]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    spotifyRef.current.player?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const aoAtualizar = () => motor === 'audio' && setProgresso(audio.currentTime);
    const aoTerminar = () => proximaRef.current(true);
    audio.addEventListener('timeupdate', aoAtualizar);
    audio.addEventListener('ended', aoTerminar);
    return () => {
      audio.removeEventListener('timeupdate', aoAtualizar);
      audio.removeEventListener('ended', aoTerminar);
    };
  }, [motor]);

  // ---------- motor: Spotify Web Playback SDK ----------
  useEffect(() => {
    if (motor !== 'spotify') {
      // Saiu do Spotify (ex.: próxima faixa tem arquivo): pausa o aparelho do Spotify
      if (spotifyRef.current.uriCarregada) {
        spotifyRef.current.player?.pause();
        spotifyRef.current.uriCarregada = null;
      }
      return;
    }

    let cancelado = false;
    const aoEstado = (estado) => {
      setProgresso(estado.position / 1000);
      setDuracaoReal(estado.duration / 1000);
      // Fim da faixa: o SDK pausa e volta a posição para 0
      if (estado.paused && estado.position === 0 && tocandoRef.current && spotifyRef.current.uriCarregada) {
        spotifyRef.current.uriCarregada = null;
        proximaRef.current(true);
      }
    };

    criarPlayerSpotify(aoEstado)
      .then(async ({ player, deviceId }) => {
        if (cancelado) return;
        spotifyRef.current.player = player;
        spotifyRef.current.deviceId = deviceId;
        player.setVolume(volume);
        if (!tocandoRef.current) return;
        if (spotifyRef.current.uriCarregada !== uriSpotify) {
          await spotifyService.tocarNoAparelho(deviceId, uriSpotify);
          spotifyRef.current.uriCarregada = uriSpotify;
        } else {
          await player.resume();
        }
      })
      .catch((e) => {
        if (cancelado) return;
        setFalhaSpotify(true); // cai para o modo demonstração
        setAviso(`${e.message}. Tocando em modo demonstração.`);
      });

    return () => {
      cancelado = true;
    };
    // volume fica de fora de propósito: mudar volume não deve reiniciar a faixa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, uriSpotify]);

  useEffect(() => {
    if (motor !== 'spotify') return;
    const { player, uriCarregada, deviceId } = spotifyRef.current;
    if (!player) return; // ainda criando: o efeito acima trata
    if (tocando) {
      if (uriCarregada === uriSpotify) player.resume();
      else
        spotifyService
          .tocarNoAparelho(deviceId, uriSpotify)
          .then(() => (spotifyRef.current.uriCarregada = uriSpotify))
          .catch((e) => setAviso(e.message));
    } else {
      player.pause();
    }
  }, [tocando, motor, uriSpotify]);

  // O SDK não avisa a posição sozinho a cada segundo: perguntamos enquanto toca
  useEffect(() => {
    if (motor !== 'spotify' || !tocando) return;
    const timer = setInterval(() => {
      spotifyRef.current.player?.getCurrentState().then((s) => s && setProgresso(s.position / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [motor, tocando]);

  // ---------- motor: demonstração ----------
  useEffect(() => {
    if (!tocando || motor !== 'demo' || !atual) return;
    const passo = 0.25;
    const timer = setInterval(() => setProgresso((p) => p + passo), passo * 1000);
    return () => clearInterval(timer); // limpeza: sem isso o timer vaza ao trocar de faixa
  }, [tocando, motor, atual]);

  useEffect(() => {
    if (motor === 'demo' && duracao && progresso >= duracao) proxima(true);
  }, [progresso, duracao, motor, proxima]);

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

  /** Toca uma lista de faixas do Spotify (ex.: resultado da busca). */
  const tocarSpotify = useCallback((faixas, aPartirDe = 0) => {
    if (!faixas.length) return;
    setFila(faixas.map(paraFilaSpotify));
    setIndice(aPartirDe);
    setProgresso(0);
    setTocando(true);
  }, []);

  const adicionarEntrada = useCallback(
    (entrada) => {
      setFila((f) => [...f, entrada]);
      if (indice === -1) setIndice(0);
    },
    [indice],
  );

  const adicionarNaFila = useCallback((item, faixa) => adicionarEntrada(paraFila(item, faixa)), [adicionarEntrada]);
  const adicionarSpotifyNaFila = useCallback((faixa) => adicionarEntrada(paraFilaSpotify(faixa)), [adicionarEntrada]);

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
      if (motor === 'audio' && audioRef.current) audioRef.current.currentTime = alvo;
      if (motor === 'spotify') spotifyRef.current.player?.seek(alvo * 1000);
    },
    [duracao, motor],
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
      motor,
      viaSpotify,
      linkSpotify,
      precisaPremium,
      aviso,
      temAudioReal: motor === 'audio' || motor === 'spotify',
      tocarItem,
      tocarSpotify,
      adicionarNaFila,
      adicionarSpotifyNaFila,
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
    [fila, indice, atual, tocando, progresso, duracao, volume, aleatorio, repetir, arquivos, motor, viaSpotify, linkSpotify, precisaPremium, aviso,
      tocarItem, tocarSpotify, adicionarNaFila, adicionarSpotifyNaFila, removerDaFila, moverNaFila, irPara, buscar,
      vincularArquivo, proxima, anterior],
  );

  return <PlayerContext.Provider value={valor}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}
