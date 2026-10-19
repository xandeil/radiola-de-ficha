import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useStreaming } from '@/contexts/StreamingContext';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { catalogoService } from '@/services/catalogoService';
import { spotifyService } from '@/services/streaming/spotifyService';
import TituloPagina from '@/components/ui/TituloPagina';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import CapaMidia from '@/components/catalogo/CapaMidia';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { formatarDuracao } from '@/utils/formatadores';
import styles from './BuscaPage.module.css';

/*
 * RF022 – Busca unificada: um campo, duas fontes pesquisadas ao mesmo tempo.
 *
 * As duas buscas são INDEPENDENTES (dois useCarregar). Se o Spotify cair,
 * os resultados da coleção continuam aparecendo — uma fonte não derruba a outra.
 */

/** Procura o termo nos itens e nas faixas da coleção. */
function buscarNaColecao(itens, termo) {
  const t = termo.trim().toLowerCase();
  if (!t) return { itens: [], faixas: [] };
  const bate = (texto) => (texto || '').toLowerCase().includes(t);

  const achadosItens = itens.filter((i) => bate(i.titulo) || bate(i.artista));
  const achadasFaixas = itens.flatMap((item) =>
    (item.faixas || []).map((faixa, posicao) => ({ item, faixa, posicao })).filter(({ faixa }) => bate(faixa.titulo) || bate(faixa.compositores)),
  );
  return { itens: achadosItens, faixas: achadasFaixas };
}

export default function BuscaPage() {
  const [params, setParams] = useSearchParams();
  const termo = params.get('q') || '';
  const termoAtrasado = useDebounce(termo, 350);
  const { spotify } = useStreaming();
  const { tocarItem, tocarSpotify, adicionarSpotifyNaFila, atual, tocando } = usePlayer();

  // A coleção é carregada uma vez e filtrada aqui (no back real, viraria /busca?q=)
  const colecao = useCarregar(() => catalogoService.listar(), []);
  const resultadosSpotify = useCarregar(
    () => (spotify.conectado && termoAtrasado.trim() ? spotifyService.buscar(termoAtrasado, 12) : Promise.resolve([])),
    [termoAtrasado, spotify.conectado],
  );

  const daColecao = useMemo(() => buscarNaColecao(colecao.dados || [], termoAtrasado), [colecao.dados, termoAtrasado]);
  const faixasSpotify = resultadosSpotify.dados || [];
  const temTermo = termoAtrasado.trim().length > 0;
  const nadaAchado = temTermo && !daColecao.itens.length && !daColecao.faixas.length && !faixasSpotify.length && !resultadosSpotify.carregando;

  return (
    <>
      <TituloPagina titulo="Buscar" subtitulo="Na sua coleção e nos serviços de streaming conectados." />

      <div className={styles.campo} role="search">
        <Entrada
          aria-label="Buscar música, artista ou álbum"
          type="search"
          placeholder="Música, artista ou álbum..."
          autoFocus
          value={termo}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        />
      </div>

      {!temTermo ? (
        <EstadoVazio titulo="O que vamos ouvir?" mensagem="Digite para procurar ao mesmo tempo nos seus discos e no Spotify." />
      ) : nadaAchado ? (
        <EstadoVazio titulo="Nada encontrado" mensagem={`Nenhum resultado para "${termoAtrasado}".`} />
      ) : (
        <div className={styles.colunas}>
          <section className={styles.bloco}>
            <h2 className={styles.tituloBloco}>
              <Icone nome="disco" /> Na sua coleção
            </h2>
            {colecao.carregando ? (
              <Carregando />
            ) : !daColecao.itens.length && !daColecao.faixas.length ? (
              <p className={styles.vazio}>Nada na coleção com esse termo.</p>
            ) : (
              <>
                {daColecao.itens.length > 0 && (
                  <div className={styles.discos}>
                    {daColecao.itens.map((item) => (
                      <Link key={item.id} to={`/catalogo/${item.id}`} className={styles.disco}>
                        <CapaMidia item={item} tamanho="miniatura" />
                        <span>{item.titulo}</span>
                        <small>{item.artista}</small>
                      </Link>
                    ))}
                  </div>
                )}
                {daColecao.faixas.length > 0 && (
                  <ul className={styles.lista}>
                    {daColecao.faixas.map(({ item, faixa, posicao }) => {
                      const ativa = atual?.fonte === 'local' && atual.id === faixa.id && tocando;
                      return (
                        <li key={`${item.id}-${faixa.id}`} className={styles.linha}>
                          <button type="button" className={styles.play} onClick={() => tocarItem(item, posicao)} aria-label={`Tocar ${faixa.titulo}`}>
                            <Icone nome={ativa ? 'pause' : 'play'} tamanho={14} />
                          </button>
                          <span className={styles.texto}>
                            <strong>{faixa.titulo}</strong>
                            <small>
                              {item.titulo} · {item.tipo_midia}
                            </small>
                          </span>
                          <span className={styles.duracao}>{formatarDuracao(faixa.duracao_segundos)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>

          <section className={styles.bloco}>
            <div className={styles.cabecalhoBloco}>
              <h2 className={styles.tituloBloco}>
                <span className={styles.bolinhaSpotify} aria-hidden="true" /> Spotify{spotify.modoDemo && ' (demo)'}
              </h2>
              {faixasSpotify.length > 1 && (
                <Botao variante="fantasma" tamanho="pequeno" onClick={() => tocarSpotify(faixasSpotify)}>
                  Tocar tudo
                </Botao>
              )}
            </div>

            {!spotify.conectado ? (
              <div className={styles.conectar}>
                <p className={styles.vazio}>Conecte sua conta para buscar também no Spotify.</p>
                <Botao variante="secundario" para="/configuracoes">Conectar Spotify</Botao>
              </div>
            ) : resultadosSpotify.carregando ? (
              <Carregando />
            ) : resultadosSpotify.erro ? (
              <EstadoErro erro={resultadosSpotify.erro} aoTentarDeNovo={resultadosSpotify.recarregar} />
            ) : !faixasSpotify.length ? (
              <p className={styles.vazio}>Nada no Spotify com esse termo.</p>
            ) : (
              <ul className={styles.lista}>
                {faixasSpotify.map((faixa, i) => {
                  const ativa = atual?.fonte === 'spotify' && atual.id === faixa.id && tocando;
                  return (
                    <li key={faixa.id} className={styles.linha}>
                      <button type="button" className={styles.play} onClick={() => tocarSpotify(faixasSpotify, i)} aria-label={`Tocar ${faixa.titulo}`}>
                        <Icone nome={ativa ? 'pause' : 'play'} tamanho={14} />
                      </button>
                      <span className={styles.texto}>
                        <strong>{faixa.titulo}</strong>
                        <small>
                          {faixa.artista} · {faixa.album}
                        </small>
                      </span>
                      <span className={styles.duracao}>{formatarDuracao(faixa.duracao_segundos)}</span>
                      <button type="button" className={styles.acao} onClick={() => adicionarSpotifyNaFila(faixa)} aria-label={`Adicionar ${faixa.titulo} à fila`} title="Adicionar à fila">
                        <Icone nome="fila" tamanho={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
