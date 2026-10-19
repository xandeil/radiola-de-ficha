import { atraso } from '@/services/api';
import { faixasSpotifyDemo, usuarioSpotifyDemo } from '@/mocks/spotifyDemo';
import { iniciarLoginSpotify, spotifyConfigurado, tokenSpotify, tokenValido } from './spotifyAuth';

/*
 * Tudo que a Radiola pede ao Spotify passa por aqui.
 *
 * Dois modos:
 *  - REAL: existe VITE_SPOTIFY_CLIENT_ID no .env -> chama a Web API de verdade.
 *  - DEMONSTRAÇÃO: sem client id -> usa o catálogo falso de mocks/spotifyDemo.js.
 *
 * As respostas são NORMALIZADAS para o mesmo formato nos dois modos
 * ({ id, uri, titulo, artista, album, duracao_segundos, capa_imagem }).
 * Assim o resto do app nunca lida com o JSON cru do Spotify — se um dia
 * entrar o Deezer, ele só precisa devolver esse mesmo formato. Isso é o
 * padrão "Adapter".
 */

const DEMO_KEY = 'radiola.spotify.demo';
export const modoDemo = !spotifyConfigurado;

function normalizarFaixa(t) {
  return {
    id: t.id,
    uri: t.uri,
    titulo: t.name,
    artista: t.artists.map((a) => a.name).join(', '),
    album: t.album?.name,
    duracao_segundos: Math.round(t.duration_ms / 1000),
    capa_imagem: t.album?.images?.at(-2)?.url || t.album?.images?.[0]?.url || null,
    link: t.external_urls?.spotify,
  };
}

async function api(caminho, opcoes = {}) {
  const token = await tokenValido();
  if (!token) throw Object.assign(new Error('Spotify desconectado'), { status: 401 });
  const resposta = await fetch(`https://api.spotify.com/v1${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opcoes.headers },
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw Object.assign(new Error(dados?.error?.message || 'Erro no Spotify'), { status: resposta.status });
  return dados;
}

/** Busca simples por texto no catálogo demo (título, artista ou álbum). */
function buscarDemo(termo, limite) {
  const t = termo.toLowerCase();
  return faixasSpotifyDemo
    .filter((f) => [f.titulo, f.artista, f.album].some((campo) => campo.toLowerCase().includes(t)))
    .slice(0, limite);
}

export const spotifyService = {
  modoDemo,

  estaConectado() {
    return modoDemo ? localStorage.getItem(DEMO_KEY) === '1' : Boolean(tokenSpotify.ler());
  },

  async conectar() {
    if (modoDemo) {
      localStorage.setItem(DEMO_KEY, '1');
      return usuarioSpotifyDemo;
    }
    await iniciarLoginSpotify(); // sai da página; a volta cai em /callback/spotify
    return null;
  },

  desconectar() {
    localStorage.removeItem(DEMO_KEY);
    tokenSpotify.limpar();
  },

  async perfil() {
    if (modoDemo) {
      await atraso(150);
      return usuarioSpotifyDemo;
    }
    const eu = await api('/me');
    return { id: eu.id, nome: eu.display_name || eu.id, premium: eu.product === 'premium' };
  },

  /** RF022 – busca de faixas */
  async buscar(termo, limite = 10) {
    if (!termo.trim()) return [];
    if (modoDemo) {
      await atraso(300);
      return buscarDemo(termo, limite);
    }
    const params = new URLSearchParams({ q: termo, type: 'track', limit: String(limite), market: 'BR' });
    const dados = await api(`/search?${params}`);
    return dados.tracks.items.map(normalizarFaixa);
  },

  /**
   * RF024 – Fallback: acha no Spotify a faixa de um disco que não tem arquivo.
   * Usa os filtros de campo da busca do Spotify (track: e artist:) para errar menos.
   */
  async encontrarFaixa(titulo, artista) {
    if (modoDemo) {
      const t = titulo.toLowerCase();
      return faixasSpotifyDemo.find((f) => f.titulo.toLowerCase() === t) || null;
    }
    const q = artista && artista !== 'Vários Artistas' ? `track:${titulo} artist:${artista}` : `track:${titulo}`;
    const resultado = await this.buscar(q, 1).catch(() => []);
    return resultado[0] || null;
  },

  /** Manda o Spotify tocar uma faixa no "aparelho" do navegador (Web Playback SDK). */
  async tocarNoAparelho(deviceId, uri, posicaoMs = 0) {
    return api(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [uri], position_ms: posicaoMs }),
    });
  },
};
