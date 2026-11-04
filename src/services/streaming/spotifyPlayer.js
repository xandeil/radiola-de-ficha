import { tokenValido } from './spotifyAuth';
import { t as traduzir } from '@/i18n';

/*
 * Carrega o Spotify Web Playback SDK e cria UM player para o app inteiro
 * (padrão Singleton: chamar criarPlayerSpotify() várias vezes devolve o mesmo).
 *
 * O SDK transforma a aba do navegador num "aparelho" Spotify, igual a um
 * celular ou caixa de som. Exige conta Premium.
 */

let promessa = null;

function carregarScript() {
  return new Promise((resolve, reject) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = resolve; // o SDK chama esta função quando termina de carregar
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => reject(new Error(traduzir('erros.spotifyPlayer')));
    document.body.appendChild(script);
  });
}

/**
 * Resolve com { player, deviceId } quando o aparelho estiver pronto.
 * aoMudarEstado recebe os eventos de reprodução (posição, pausa, fim).
 */
export function criarPlayerSpotify(aoMudarEstado) {
  if (promessa) return promessa;

  promessa = carregarScript().then(
    () =>
      new Promise((resolve, reject) => {
        const player = new window.Spotify.Player({
          name: 'Radiola de Ficha',
          getOAuthToken: (cb) => tokenValido().then((t) => cb(t)),
          volume: 0.8,
        });

        player.addListener('ready', ({ device_id }) => resolve({ player, deviceId: device_id }));
        player.addListener('not_ready', () => {});
        player.addListener('player_state_changed', (estado) => estado && aoMudarEstado?.(estado));
        player.addListener('initialization_error', ({ message }) => reject(new Error(message)));
        player.addListener('authentication_error', ({ message }) => reject(new Error(message)));
        player.addListener('account_error', () => reject(new Error(traduzir('erros.spotifyPremium'))));

        player.connect();
      }),
  );

  // Se falhar, permite tentar de novo depois (ex.: usuário reconectou a conta)
  promessa.catch(() => {
    promessa = null;
  });
  return promessa;
}
