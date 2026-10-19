/*
 * Login no Spotify com OAuth 2.0 + PKCE (RF021).
 *
 * Como funciona, em 4 passos:
 *  1. Geramos um segredo aleatório (code_verifier) e o seu hash (code_challenge).
 *  2. Mandamos o usuário para a página de login do Spotify levando só o hash.
 *  3. O Spotify devolve o usuário para /callback/spotify com um "code".
 *  4. Trocamos code + segredo original por um access_token.
 * O PKCE existe justamente para apps que rodam no navegador: não precisamos
 * do client_secret (que nunca pode ficar no front-end).
 *
 * ⚠️ Em produção o documento pede tokens criptografados no back-end (RNF031).
 * Aqui guardamos no localStorage para a Fase 2 funcionar sem servidor;
 * quando o PHP existir, os passos 3 e 4 migram para lá.
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const TOKEN_KEY = 'radiola.spotify.token';
const VERIFIER_KEY = 'radiola.spotify.verifier';
const STATE_KEY = 'radiola.spotify.state';

const ESCOPOS = [
  'streaming', // Web Playback SDK
  'user-read-email',
  'user-read-private', // saber se é Premium
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

export const spotifyConfigurado = Boolean(CLIENT_ID);
export const redirectUri = () => `${window.location.origin}/callback/spotify`;

// ---------- utilitários de criptografia ----------
function aleatorio(tamanho = 64) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const valores = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(valores, (v) => caracteres[v % caracteres.length]).join('');
}

async function sha256Base64Url(texto) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ---------- armazenamento do token ----------
export const tokenSpotify = {
  ler() {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY));
    } catch {
      return null;
    }
  },
  salvar({ access_token, refresh_token, expires_in }) {
    const anterior = this.ler();
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({
        access_token,
        refresh_token: refresh_token || anterior?.refresh_token, // o refresh nem sempre volta de novo
        expira_em: Date.now() + (expires_in - 60) * 1000, // 60s de folga
      }),
    );
  },
  limpar() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function pedirToken(parametros) {
  const resposta = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...parametros }),
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.error_description || 'Falha ao autenticar no Spotify');
  tokenSpotify.salvar(dados);
  return dados.access_token;
}

// ---------- fluxo público ----------
export async function iniciarLoginSpotify() {
  if (!CLIENT_ID) throw new Error('Configure VITE_SPOTIFY_CLIENT_ID no arquivo .env');
  if (!window.crypto?.subtle) {
    throw new Error('O login do Spotify precisa de HTTPS ou de http://127.0.0.1');
  }
  const verifier = aleatorio();
  const state = aleatorio(16); // protege contra CSRF no retorno
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: ESCOPOS,
    code_challenge_method: 'S256',
    code_challenge: await sha256Base64Url(verifier),
    state,
  });
  window.location.assign(url);
}

export async function concluirLoginSpotify(parametrosUrl) {
  const erro = parametrosUrl.get('error');
  if (erro) throw new Error(erro === 'access_denied' ? 'Você cancelou a conexão com o Spotify' : erro);

  const code = parametrosUrl.get('code');
  const state = parametrosUrl.get('state');
  if (!code || state !== sessionStorage.getItem(STATE_KEY)) throw new Error('Retorno do Spotify inválido. Tente conectar de novo.');

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier });
}

/** Devolve um access_token válido, renovando sozinho se expirou. */
export async function tokenValido() {
  const token = tokenSpotify.ler();
  if (!token) return null;
  if (Date.now() < token.expira_em) return token.access_token;
  if (!token.refresh_token) return null;
  try {
    return await pedirToken({ grant_type: 'refresh_token', refresh_token: token.refresh_token });
  } catch {
    tokenSpotify.limpar();
    return null;
  }
}
