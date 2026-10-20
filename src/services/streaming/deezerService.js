import { t as traduzir } from '@/i18n';
import { jsonp } from './jsonp';

/*
 * Deezer (RF021, seção 11.1).
 *
 * A API pública do Deezer (api.deezer.com) busca músicas SEM login e devolve,
 * para cada faixa, uma PRÉVIA de 30 segundos em MP3 — que a nossa vitrola
 * toca com o <audio> normal. Ou seja: funciona de verdade, sem configurar nada.
 *
 * A reprodução da faixa inteira fica no app do Deezer (link "Abrir no Deezer"):
 * o Deezer não oferece a apps de terceiros um player de faixa completa como
 * o Web Playback SDK do Spotify.
 *
 * Login (OAuth) é opcional: com VITE_DEEZER_APP_ID no .env, o usuário entra
 * com a conta dele e mostramos o nome (e dá para evoluir para playlists/favoritos).
 * Sem ele, "conectar" liga o modo público: busca + prévias.
 *
 * Formato normalizado (Adapter): igual ao do Spotify, mais `servico` e `preview_url`.
 */

const API = 'https://api.deezer.com';
const APP_ID = import.meta.env.VITE_DEEZER_APP_ID || '';
const CHAVE_ATIVO = 'radiola.deezer.ativo';
const CHAVE_TOKEN = 'radiola.deezer.token';

export const deezerComLogin = Boolean(APP_ID);
export const redirectUriDeezer = () => `${window.location.origin}/callback/deezer`;

function normalizar(t) {
  return {
    servico: 'deezer',
    id: String(t.id),
    uri: `deezer:track:${t.id}`,
    titulo: t.title,
    artista: t.artist?.name || '',
    album: t.album?.title || '',
    duracao_segundos: t.duration,
    capa_imagem: t.album?.cover_medium || null,
    preview_url: t.preview || null,
    link: t.link,
    cor_capa: '#a238ff',
  };
}

const lerToken = () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_TOKEN));
    return salvo && salvo.expira > Date.now() ? salvo.access_token : null;
  } catch {
    return null;
  }
};

async function chamar(caminho, params = {}) {
  const token = lerToken();
  const qs = new URLSearchParams({ ...params, output: 'jsonp', ...(token && { access_token: token }) });
  const dados = await jsonp(`${API}${caminho}?${qs}`);
  if (dados?.error) throw Object.assign(new Error(dados.error.message || traduzir('erros.deezer')), { status: dados.error.code === 300 ? 401 : 400 });
  return dados;
}

export const deezerService = {
  id: 'deezer',
  nome: 'Deezer',
  cor: '#a238ff',
  modoDemo: false,
  /** 'publico' = busca + prévias de 30s · 'conta' = logado com OAuth */
  modo: () => (lerToken() ? 'conta' : 'publico'),

  estaConectado() {
    return localStorage.getItem(CHAVE_ATIVO) === '1' || Boolean(lerToken());
  },

  /** Com App ID: vai para o login do Deezer (fluxo implícito). Sem: liga o modo público na hora. */
  async conectar() {
    if (!deezerComLogin) {
      localStorage.setItem(CHAVE_ATIVO, '1');
      return true;
    }
    const params = new URLSearchParams({ app_id: APP_ID, redirect_uri: redirectUriDeezer(), perms: 'basic_access,email', response_type: 'token' });
    window.location.assign(`https://connect.deezer.com/oauth/auth.php?${params}`);
    return null;
  },

  /** Volta do login: o token vem no #hash da URL (#access_token=...&expires=...). */
  concluirLogin(hash) {
    const p = new URLSearchParams(hash.replace(/^#/, ''));
    const token = p.get('access_token');
    if (!token) throw new Error(p.get('error_reason') === 'user_denied' ? traduzir('erros.deezerNegado') : traduzir('erros.deezerSemAcesso'));
    const expiraEm = Number(p.get('expires')) || 3600; // 0 = "sem validade" (permissão offline_access)
    localStorage.setItem(CHAVE_TOKEN, JSON.stringify({ access_token: token, expira: Date.now() + (expiraEm || 365 * 86400) * 1000 }));
    localStorage.setItem(CHAVE_ATIVO, '1');
  },

  desconectar() {
    localStorage.removeItem(CHAVE_ATIVO);
    localStorage.removeItem(CHAVE_TOKEN);
  },

  async perfil() {
    if (!lerToken()) return { nome: null, publico: true };
    const eu = await chamar('/user/me');
    return { id: eu.id, nome: eu.name, publico: false };
  },

  async buscar(termo, limite = 10) {
    if (!termo.trim()) return [];
    const dados = await chamar('/search', { q: termo, limit: String(limite) });
    return (dados.data || []).filter((t) => t.readable !== false).map(normalizar);
  },

  /** Fallback (RF024): busca avançada do Deezer com track:"" artist:"" */
  async encontrarFaixa(titulo, artista) {
    const q = artista && artista !== 'Vários Artistas' ? `track:"${titulo}" artist:"${artista}"` : `track:"${titulo}"`;
    const achadas = await this.buscar(q, 1).catch(() => []);
    return achadas[0] || null;
  },
};
