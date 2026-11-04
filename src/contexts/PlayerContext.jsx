import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStreaming } from './StreamingContext';
import { usePlano } from './PlanoContext';
import { publicidadeService } from '@/services/publicidadeService';
import { spotifyService } from '@/services/streaming/spotifyService';
import { criarPlayerSpotify } from '@/services/streaming/spotifyPlayer';
import { carregarMusicKit } from '@/services/streaming/appleMusicService';
import { servicoPorId } from '@/services/streaming/servicos';
import { t as traduzir } from '@/i18n';

/*
 * O "motor" da Radiola (RF019, RF021, RF024, RF025, RF026).
 *
 * A fila mistura faixas de várias FONTES:
 *  - 'local'                       -> faixa de um disco do seu catálogo
 *  - 'spotify' | 'deezer' | 'apple' -> faixa achada na busca de um streaming
 *
 * E cada faixa toca por um destes MOTORES:
 *  - 'audio'   -> <audio> do navegador: arquivo vinculado OU prévia de 30s (Deezer/Apple)
 *  - 'spotify' -> Spotify real conectado e Premium: Web Playback SDK
 *  - 'apple'   -> Apple Music autorizado pelo MusicKit: faixa inteira
 *  - 'demo'    -> nenhum dos anteriores: o tempo anda com um timer (sem som)
 *
 * Fallback automático (RF024): faixa local sem arquivo -> procuramos a mesma
 * música nos serviços conectados, na ordem de preferência do usuário.
 *
 * Intervalo publicitário (Fase 4, seção 8.1), só no plano gratuito:
 *  - vinheta: 1 por sessão, antes da primeira música
 *  - intersticial: a cada 5 faixas
 * Enquanto o intervalo está aberto, o som fica pausado; ao fechar, volta a tocar.
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

/** Entrada da fila para uma faixa de streaming (Spotify, Deezer ou Apple Music). */
const paraFilaStreaming = (faixa) => {
  const servico = faixa.servico || 'spotify';
  return {
    id: faixa.id,
    fonte: servico,
    servico,
    chave: `${servico}-${faixa.id}`,
    titulo: faixa.titulo,
    duracao_segundos: faixa.duracao_segundos,
    uri: faixa.uri,
    link: faixa.link,
    preview_url: faixa.preview_url,
    item: {
      id: null,
      titulo: faixa.album,
      artista: faixa.artista,
      tipo_midia: servicoPorId(servico)?.nome || 'Streaming',
      cor_capa: faixa.cor_capa || servicoPorId(servico)?.cor || '#1f7a4d',
      capa_imagem: faixa.capa_imagem,
    },
  };
};

export function PlayerProvider({ children }) {
  const { spotify, apple, conectados, fallback } = useStreaming();
  const { comPropaganda } = usePlano();
  const comPropagandaRef = useRef(comPropaganda);
  comPropagandaRef.current = comPropaganda;
  const [intervalo, setIntervalo] = useState(null); // { tipo, campanha, idImpressao }
  const faixasDesdeIntervalo = useRef(0);

  const [fila, setFila] = useState([]);
  const [indice, setIndice] = useState(-1);
  const [tocando, setTocando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [aleatorio, setAleatorio] = useState(false);
  const [repetir, setRepetir] = useState('off'); // 'off' | 'todas' | 'uma'
  const [arquivos, setArquivos] = useState({}); // { [faixaId]: blobUrl } desta sessão
  const [resolvidos, setResolvidos] = useState({}); // fallback: { [chave]: faixaDeStreaming | null }
  const [aviso, setAviso] = useState(null);
  const [falhaSpotify, setFalhaSpotify] = useState(false);
  const [falhaApple, setFalhaApple] = useState(false);
  const [duracaoReal, setDuracaoReal] = useState(null);

  const audioRef = useRef(null);
  if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();
  const spotifyRef = useRef({ player: null, deviceId: null, uriCarregada: null });
  const appleRef = useRef({ music: null, idCarregado: null });

  const atual = fila[indice] || null;

  // ---------- qual motor toca a faixa atual? ----------
  const urlLocal = atual?.fonte === 'local' ? arquivos[atual.id] || atual.arquivo_audio : null;
  const faixaFallback = atual ? resolvidos[atual.chave] : undefined;
  const precisaFallback = atual?.fonte === 'local' && !urlLocal && fallback && conectados.length > 0;
  const resolvendo = precisaFallback && faixaFallback === undefined;
  // A faixa de streaming que vai tocar: a própria (veio da busca) ou a achada no fallback
  const faixaStreaming = atual && atual.fonte !== 'local' ? atual : precisaFallback ? faixaFallback || null : null;
  const servicoAtual = faixaStreaming?.servico || null;
  const uriSpotify = servicoAtual === 'spotify' ? faixaStreaming.uri : null;
  const idApple = servicoAtual === 'apple' ? faixaStreaming.id : null;

  const spotifyReal = spotify.conectado && !spotify.modoDemo && spotify.premium && !falhaSpotify;
  const appleReal = apple.conectado && apple.perfil && !apple.perfil.publico && !falhaApple;

  let motor = 'demo';
  let urlAudio = null;
  let previa = false;
  if (urlLocal) {
    motor = 'audio';
    urlAudio = urlLocal;
  } else if (resolvendo) motor = 'aguardando';
  else if (uriSpotify && spotifyReal) motor = 'spotify';
  else if (idApple && appleReal) motor = 'apple';
  else if (faixaStreaming?.preview_url) {
    motor = 'audio'; // prévia de 30s: toca no mesmo <audio> dos arquivos
    urlAudio = faixaStreaming.preview_url;
    previa = true;
  }

  const viaSpotify = servicoAtual === 'spotify'; // tocando "do Spotify", mesmo que em modo demo
  const linkExterno = faixaStreaming?.link || null;
  const linkSpotify = viaSpotify ? linkExterno : null;
  // Conta Free do Spotify não toca no navegador: oferecemos abrir no app
  const precisaPremium = viaSpotify && spotify.conectado && !spotify.modoDemo && !spotify.premium && !previa;
  const duracao =
    (['spotify', 'apple'].includes(motor) && duracaoReal) || (previa && (duracaoReal || 30)) || faixaFallback?.duracao_segundos || atual?.duracao_segundos || 0;

  // ---------- intervalo publicitário ----------
  const abrirIntervalo = useCallback((tipo) => {
    if (!comPropagandaRef.current) return false;
    const campanha = publicidadeService.escolher(tipo);
    if (!campanha) return false; // limite de frequência atingido: segue sem anúncio
    setTocando(false);
    setIntervalo({ tipo, campanha, idImpressao: publicidadeService.registrarImpressao(campanha, tipo, 'player') });
    return true;
  }, []);

  const fecharIntervalo = useCallback(() => {
    setIntervalo(null);
    faixasDesdeIntervalo.current = 0;
    setTocando(true);
  }, []);

  /** Começa a tocar, passando pela vinheta se for a primeira vez na sessão. */
  const comecar = useCallback(() => {
    if (!abrirIntervalo('vinheta')) setTocando(true);
  }, [abrirIntervalo]);

  // ---------- navegação na fila ----------
  const proxima = useCallback(
    (automatico = false) => {
      if (!fila.length) return;
      if (automatico && repetir === 'uma') {
        setProgresso(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
        spotifyRef.current.player?.seek(0);
        appleRef.current.music?.seekToTime(0);
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
      faixasDesdeIntervalo.current += 1;
      if (faixasDesdeIntervalo.current >= 5) abrirIntervalo('intersticial');
    },
    [fila.length, indice, aleatorio, repetir, abrirIntervalo],
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
      appleRef.current.music?.seekToTime(0);
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

  // ---------- fallback: procurar nos serviços conectados, na ordem de preferência ----------
  const idsConectados = conectados.map((c) => c.id).join(',');
  useEffect(() => {
    if (!resolvendo) return;
    let cancelado = false;
    const chave = atual.chave;
    (async () => {
      for (const id of idsConectados.split(',')) {
        const achada = await servicoPorId(id).encontrarFaixa(atual.titulo, atual.item.artista).catch(() => null);
        if (cancelado) return;
        if (achada) {
          setResolvidos((r) => ({ ...r, [chave]: achada }));
          setAviso(traduzir('player.tocandoPor', { servico: servicoPorId(id).nome, titulo: achada.titulo, artista: achada.artista }));
          return;
        }
      }
      if (!cancelado) setResolvidos((r) => ({ ...r, [chave]: null }));
    })();
    return () => {
      cancelado = true;
    };
  }, [resolvendo, atual, idsConectados]);

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
    if (appleRef.current.music) appleRef.current.music.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const aoAtualizar = () => motor === 'audio' && setProgresso(audio.currentTime);
    const aoTerminar = () => proximaRef.current(true);
    // Prévias têm ~30s: usamos a duração real do arquivo, não a da faixa completa
    const aoCarregar = () => previa && Number.isFinite(audio.duration) && setDuracaoReal(audio.duration);
    // Prévia que não carrega (link expirado, sem internet): avisa e segue para a próxima
    const aoFalhar = () => {
      if (!previa) return;
      setAviso(traduzir('player.previaIndisponivel'));
      setTocando(false);
    };
    audio.addEventListener('timeupdate', aoAtualizar);
    audio.addEventListener('ended', aoTerminar);
    audio.addEventListener('loadedmetadata', aoCarregar);
    audio.addEventListener('error', aoFalhar);
    return () => {
      audio.removeEventListener('timeupdate', aoAtualizar);
      audio.removeEventListener('ended', aoTerminar);
      audio.removeEventListener('loadedmetadata', aoCarregar);
      audio.removeEventListener('error', aoFalhar);
    };
  }, [motor, previa]);

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

  // ---------- motor: Apple Music (MusicKit JS) ----------
  useEffect(() => {
    if (motor !== 'apple') {
      if (appleRef.current.idCarregado) {
        appleRef.current.music?.stop();
        appleRef.current.idCarregado = null;
      }
      return;
    }
    let cancelado = false;
    let music;
    const aoTempo = () => setProgresso(music.currentPlaybackTime || 0);
    const aoEstado = ({ state }) => {
      const E = window.MusicKit?.PlaybackStates || {};
      if (state === E.completed || state === E.ended) proximaRef.current(true);
    };
    carregarMusicKit()
      .then(async (m) => {
        if (cancelado) return;
        music = m;
        appleRef.current.music = m;
        m.volume = volume;
        m.addEventListener('playbackTimeDidChange', aoTempo);
        m.addEventListener('playbackStateDidChange', aoEstado);
        if (appleRef.current.idCarregado !== idApple) {
          await m.setQueue({ song: idApple, startPlaying: tocandoRef.current });
          appleRef.current.idCarregado = idApple;
          setDuracaoReal(m.currentPlaybackDuration || null);
        }
      })
      .catch((e) => {
        if (cancelado) return;
        setFalhaApple(true); // cai para a prévia de 30s
        setAviso(`${e.message}. ${traduzir('player.usandoPrevia')}`);
      });
    return () => {
      cancelado = true;
      music?.removeEventListener('playbackTimeDidChange', aoTempo);
      music?.removeEventListener('playbackStateDidChange', aoEstado);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, idApple]);

  useEffect(() => {
    const { music, idCarregado } = appleRef.current;
    if (motor !== 'apple' || !music || idCarregado !== idApple) return;
    if (tocando) music.play().catch((e) => setAviso(e.message));
    else music.pause();
  }, [tocando, motor, idApple]);

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
    comecar();
    return true;
  }, [comecar]);

  /** Toca uma lista de faixas de streaming (ex.: resultado da busca). */
  const tocarStreaming = useCallback((faixas, aPartirDe = 0) => {
    if (!faixas.length) return;
    setFila(faixas.map(paraFilaStreaming));
    setIndice(aPartirDe);
    setProgresso(0);
    comecar();
  }, [comecar]);

  const adicionarEntrada = useCallback(
    (entrada) => {
      setFila((f) => [...f, entrada]);
      if (indice === -1) setIndice(0);
    },
    [indice],
  );

  const adicionarNaFila = useCallback((item, faixa) => adicionarEntrada(paraFila(item, faixa)), [adicionarEntrada]);
  const adicionarStreamingNaFila = useCallback((faixa) => adicionarEntrada(paraFilaStreaming(faixa)), [adicionarEntrada]);

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
      if (motor === 'apple') appleRef.current.music?.seekToTime(alvo);
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
      servicoAtual,
      linkExterno,
      previa,
      precisaPremium,
      aviso,
      intervalo,
      fecharIntervalo,
      temAudioReal: ['audio', 'spotify', 'apple'].includes(motor),
      tocarItem,
      tocarStreaming,
      tocarSpotify: tocarStreaming, // nome antigo, mantido por compatibilidade
      adicionarNaFila,
      adicionarStreamingNaFila,
      adicionarSpotifyNaFila: adicionarStreamingNaFila,
      removerDaFila,
      moverNaFila,
      irPara,
      buscar,
      vincularArquivo,
      alternar: () => atual && !intervalo && setTocando((t) => !t),
      proxima: () => proxima(false),
      anterior,
      setVolume,
      alternarAleatorio: () => setAleatorio((a) => !a),
      alternarRepetir: () => setRepetir((r) => ({ off: 'todas', todas: 'uma', uma: 'off' })[r]),
    }),
    [fila, indice, atual, tocando, progresso, duracao, volume, aleatorio, repetir, arquivos, motor, viaSpotify, linkSpotify, servicoAtual, linkExterno, previa, precisaPremium, aviso, intervalo, fecharIntervalo,
      tocarItem, tocarStreaming, adicionarNaFila, adicionarStreamingNaFila, removerDaFila, moverNaFila, irPara, buscar,
      vincularArquivo, proxima, anterior],
  );

  return <PlayerContext.Provider value={valor}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}
