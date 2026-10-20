/*
 * Catálogo falso do "Spotify (demonstração)".
 * Usado quando não existe VITE_SPOTIFY_CLIENT_ID no .env, para você
 * conseguir ver a busca unificada e as playlists funcionando sem conta.
 *
 * O formato imita o que a API real devolve depois de normalizado
 * pelo spotifyService (id, uri, titulo, artista, album, duracao...).
 */

const faixa = (id, titulo, artista, album, duracao_segundos, cor_capa) => ({
  servico: 'spotify',
  id: `demo-${id}`,
  uri: `spotify:track:demo${id}`,
  titulo,
  artista,
  album,
  duracao_segundos,
  cor_capa,
  capa_imagem: null,
  link: 'https://open.spotify.com/',
});

export const faixasSpotifyDemo = [
  faixa(1, 'Asa Branca', 'Luiz Gonzaga', 'Asa Branca', 168, '#b5651d'),
  faixa(2, 'Águas de Março', 'Elis Regina', 'Elis & Tom', 212, '#5c7a4f'),
  faixa(3, 'O Trem Azul', 'Lô Borges', 'Clube da Esquina', 245, '#3f6d7a'),
  faixa(4, 'Que Beleza', 'Tim Maia', 'Tim Maia Racional Vol. 1', 240, '#c9a227'),
  faixa(5, 'Tempo Perdido', 'Legião Urbana', 'Dois', 304, '#8a8f94'),
  faixa(6, 'Maracatu Atômico', 'Chico Science & Nação Zumbi', 'Afrociberdelia', 263, '#7a2e2e'),
  faixa(7, 'A Praieira', 'Chico Science & Nação Zumbi', 'Da Lama ao Caos', 233, '#4a3b2a'),
  faixa(8, 'Diário de um Detento', 'Racionais MCs', 'Sobrevivendo no Inferno', 451, '#2b2b2b'),
  faixa(9, 'Construção', 'Chico Buarque', 'Construção', 384, '#6b5a3a'),
  faixa(10, 'Sina', 'Djavan', 'Luz', 254, '#a35a2a'),
  faixa(11, 'Eduardo e Mônica', 'Legião Urbana', 'Dois', 272, '#8a8f94'),
  faixa(12, 'Chega de Saudade', 'João Gilberto', 'Chega de Saudade', 120, '#2f5d62'),
];

export const usuarioSpotifyDemo = {
  id: 'demo',
  nome: 'Conta de demonstração',
  premium: true,
};
