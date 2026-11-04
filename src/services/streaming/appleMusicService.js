import { jsonp } from './jsonp';
import { t as traduzir } from '@/i18n';

/*
 * Apple Music (RF021, seção 11.1: "Apple Music API (ou iTunes API)").
 *
 * Dois modos, escolhidos pelo .env:
 *
 * 1) PÚBLICO (padrão, sem configurar nada): iTunes Search API.
 *    Busca no catálogo da Apple e devolve prévias de 30s que a vitrola toca.
 *
 * 2) MUSICKIT (completo): com VITE_APPLE_MUSIC_TOKEN_URL apontando para um
 *    endpoint do SEU back-end que devolve { token } — o "developer token".
 *    Esse token é um JWT assinado com a chave privada da conta Apple Developer;
 *    a chave NUNCA pode vir para o front (igual ao Access Token do Mercado Pago).
 *    O usuário autoriza com o Apple ID dele e, se for assinante do Apple Music,
 *    a faixa inteira toca no navegador pelo MusicKit JS.
 */

const TOKEN_URL = import.meta.env.VITE_APPLE_MUSIC_TOKEN_URL || '';
const PAIS = (import.meta.env.VITE_APPLE_MUSIC_STOREFRONT || 'br').toLowerCase();
const CHAVE_ATIVO = 'radiola.apple.ativo';

export const appleComMusicKit = Boolean(TOKEN_URL);

// ---------- MusicKit JS v3 (carregado só quando precisa) ----------
let promessaMusicKit = null;

async function obterDeveloperToken() {
  const resposta = await fetch(TOKEN_URL, { credentials: 'include' });
  if (!resposta.ok) throw new Error(traduzir('erros.appleToken'));
  const { token } = await resposta.json();
  return token;
}

/** Singleton: carrega o script e configura o MusicKit uma vez só. */
export function carregarMusicKit() {
  if (promessaMusicKit) return promessaMusicKit;
  promessaMusicKit = new Promise((resolve, reject) => {
    const configurar = async () => {
      try {
        const developerToken = await obterDeveloperToken();
        await window.MusicKit.configure({ developerToken, app: { name: 'Radiola de Ficha', build: '6.0.0' } });
        resolve(window.MusicKit.getInstance());
      } catch (e) {
        promessaMusicKit = null;
        reject(e);
      }
    };
    if (window.MusicKit) return configurar();
    document.addEventListener('musickitloaded', configurar, { once: true });
    const script = document.createElement('script');
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
    script.async = true;
    script.dataset.webComponents = '';
    script.onerror = () => {
      promessaMusicKit = null;
      reject(new Error(traduzir('erros.musickit')));
    };
    document.head.appendChild(script);
  });
  return promessaMusicKit;
}

// ---------- normalização (Adapter) ----------
function normalizarItunes(r) {
  return {
    servico: 'apple',
    id: String(r.trackId),
    uri: `apple:song:${r.trackId}`,
    titulo: r.trackName,
    artista: r.artistName,
    album: r.collectionName,
    duracao_segundos: Math.round((r.trackTimeMillis || 0) / 1000),
    capa_imagem: r.artworkUrl100?.replace('100x100', '300x300') || null,
    preview_url: r.previewUrl || null,
    link: r.trackViewUrl,
    cor_capa: '#fa2d48',
  };
}

function normalizarMusicKit(s) {
  const a = s.attributes;
  return {
    servico: 'apple',
    id: s.id,
    uri: `apple:song:${s.id}`,
    titulo: a.name,
    artista: a.artistName,
    album: a.albumName,
    duracao_segundos: Math.round((a.durationInMillis || 0) / 1000),
    capa_imagem: a.artwork?.url?.replace('{w}', '300').replace('{h}', '300') || null,
    preview_url: a.previews?.[0]?.url || null,
    link: a.url,
    cor_capa: '#fa2d48',
  };
}

export const appleMusicService = {
  id: 'apple',
  nome: 'Apple Music',
  cor: '#fa2d48',
  modoDemo: false,
  /** 'publico' = iTunes Search + prévias · 'conta' = MusicKit autorizado (faixa inteira) */
  modo: () => (appleComMusicKit && window.MusicKit?.getInstance?.()?.isAuthorized ? 'conta' : 'publico'),

  estaConectado() {
    return localStorage.getItem(CHAVE_ATIVO) === '1';
  },

  async conectar() {
    if (appleComMusicKit) {
      const music = await carregarMusicKit();
      await music.authorize(); // abre a janela de login do Apple ID
    }
    localStorage.setItem(CHAVE_ATIVO, '1');
    return true;
  },

  async desconectar() {
    localStorage.removeItem(CHAVE_ATIVO);
    if (appleComMusicKit && window.MusicKit) await window.MusicKit.getInstance()?.unauthorize?.().catch?.(() => {});
  },

  async perfil() {
    if (appleComMusicKit) {
      const music = await carregarMusicKit().catch(() => null);
      if (music?.isAuthorized) return { nome: 'Apple ID', publico: false, assinante: true };
    }
    return { nome: null, publico: true };
  },

  async buscar(termo, limite = 10) {
    if (!termo.trim()) return [];
    if (this.modo() === 'conta') {
      const music = await carregarMusicKit();
      const { data } = await music.api.music(`/v1/catalog/${PAIS}/search`, { term: termo, types: 'songs', limit: limite });
      return (data.results.songs?.data || []).map(normalizarMusicKit);
    }
    const qs = new URLSearchParams({ term: termo, media: 'music', entity: 'song', country: PAIS.toUpperCase(), limit: String(limite) });
    const dados = await jsonp(`https://itunes.apple.com/search?${qs}`);
    return (dados.results || []).filter((r) => r.kind === 'song').map(normalizarItunes);
  },

  async encontrarFaixa(titulo, artista) {
    const termo = artista && artista !== 'Vários Artistas' ? `${titulo} ${artista}` : titulo;
    const achadas = await this.buscar(termo, 5).catch(() => []);
    const t = titulo.toLowerCase();
    // A iTunes Search não tem filtro por campo: preferimos o resultado com o título exato
    return achadas.find((f) => f.titulo.toLowerCase() === t) || achadas[0] || null;
  },
};
