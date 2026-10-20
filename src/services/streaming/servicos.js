import { spotifyService } from './spotifyService';
import { deezerService } from './deezerService';
import { appleMusicService } from './appleMusicService';

/*
 * Registro dos serviços de streaming (padrão "Strategy").
 *
 * Todos implementam a MESMA interface:
 *   id, nome, cor, modo(), estaConectado(), conectar(), desconectar(),
 *   perfil(), buscar(termo, limite), encontrarFaixa(titulo, artista)
 * e devolvem faixas no MESMO formato ({ servico, id, titulo, artista, preview_url, link... }).
 *
 * Resultado: a busca unificada, o fallback e as configurações fazem um
 * .map() aqui e não sabem qual serviço é qual. Amazon Music ou YouTube Music
 * no futuro = um arquivo novo + uma linha nesta lista. (Aberto/Fechado do SOLID.)
 */
export const SERVICOS = [spotifyService, deezerService, appleMusicService];

export const servicoPorId = (id) => SERVICOS.find((s) => s.id === id);
