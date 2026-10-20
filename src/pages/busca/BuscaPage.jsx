import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useStreaming } from '@/contexts/StreamingContext';
import { useT } from '@/contexts/I18nContext';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { catalogoService } from '@/services/catalogoService';
import { servicoPorId } from '@/services/streaming/servicos';
import TituloPagina from '@/components/ui/TituloPagina';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import CapaMidia from '@/components/catalogo/CapaMidia';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { formatarDuracao } from '@/utils/formatadores';
import styles from './BuscaPage.module.css';

/*
 * RF022 – Busca unificada: um campo, várias fontes pesquisadas ao mesmo tempo
 * (sua coleção + cada serviço conectado: Spotify, Deezer, Apple Music).
 *
 * Cada serviço é um componente <ResultadosServico> com o SEU próprio useCarregar.
 * Se o Deezer cair, os resultados do Spotify e da coleção continuam aparecendo —
 * uma fonte não derruba a outra.
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
  const t = useT();
  const [params, setParams] = useSearchParams();
  const termo = params.get('q') || '';
  const termoAtrasado = useDebounce(termo, 350);
  const { conectados, servicos } = useStreaming();
  const { tocarItem, atual, tocando } = usePlayer();

  // A coleção é carregada uma vez e filtrada aqui (no back real, viraria /busca?q=)
  const colecao = useCarregar(() => catalogoService.listar(), []);
  const daColecao = useMemo(() => buscarNaColecao(colecao.dados || [], termoAtrasado), [colecao.dados, termoAtrasado]);
  const temTermo = termoAtrasado.trim().length > 0;
  const naoConectados = servicos.filter((s) => !s.conectado);

  return (
    <>
      <TituloPagina titulo={t('busca.titulo')} subtitulo={t('busca.subtitulo')} />

      <div className={styles.campo} role="search">
        <Entrada
          aria-label={t('busca.rotuloCampo')}
          type="search"
          placeholder={t('busca.placeholder')}
          autoFocus
          value={termo}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        />
      </div>

      {!temTermo ? (
        <EstadoVazio titulo={t('busca.vazioTitulo')} mensagem={t('busca.vazioMensagem')} />
      ) : (
        <div className={styles.colunas}>
          <section className={styles.bloco}>
            <h2 className={styles.tituloBloco}>
              <Icone nome="disco" /> {t('busca.naColecao')}
            </h2>
            {colecao.carregando ? (
              <Carregando />
            ) : !daColecao.itens.length && !daColecao.faixas.length ? (
              <p className={styles.vazio}>{t('busca.nadaColecao')}</p>
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
                          <button type="button" className={styles.play} onClick={() => tocarItem(item, posicao)} aria-label={t('player.tocarX', { titulo: faixa.titulo })}>
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

          <div className={styles.pilha}>
            {conectados.map((s) => (
              <ResultadosServico key={s.id} servico={s} termo={termoAtrasado} />
            ))}

            {naoConectados.length > 0 && (
              <section className={`${styles.bloco} ${styles.conectar}`}>
                <p className={styles.vazio}>
                  {conectados.length === 0
                    ? t('busca.semServicos')
                    : t('busca.conectarMais', { servicos: naoConectados.map((s) => s.nome).join(', ') })}
                </p>
                <Botao variante="secundario" para="/configuracoes#streaming">{t('busca.conectar')}</Botao>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Resultados de UM serviço: busca, carregando, erro e lista — independentes dos outros. */
function ResultadosServico({ servico, termo }) {
  const t = useT();
  const { tocarStreaming, adicionarStreamingNaFila, atual, tocando } = usePlayer();
  const resultado = useCarregar(() => servicoPorId(servico.id).buscar(termo, 10), [servico.id, termo]);
  const faixas = resultado.dados || [];

  return (
    <section className={styles.bloco} aria-label={servico.nome}>
      <div className={styles.cabecalhoBloco}>
        <h2 className={styles.tituloBloco}>
          <span className={styles.bolinha} style={{ background: servico.cor }} aria-hidden="true" /> {servico.nome}
          {servico.modoDemo && <small className={styles.selo}>{t('busca.demo')}</small>}
        </h2>
        {faixas.length > 1 && (
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => tocarStreaming(faixas)}>
            {t('busca.tocarTudo')}
          </Botao>
        )}
      </div>

      {resultado.carregando ? (
        <Carregando />
      ) : resultado.erro ? (
        <EstadoErro erro={resultado.erro} aoTentarDeNovo={resultado.recarregar} />
      ) : !faixas.length ? (
        <p className={styles.vazio}>{t('busca.nadaServico', { servico: servico.nome })}</p>
      ) : (
        <ul className={styles.lista}>
          {faixas.map((faixa, i) => {
            const ativa = atual?.fonte === servico.id && atual.id === faixa.id && tocando;
            return (
              <li key={faixa.id} className={styles.linha}>
                <button type="button" className={styles.play} onClick={() => tocarStreaming(faixas, i)} aria-label={t('player.tocarX', { titulo: faixa.titulo })}>
                  <Icone nome={ativa ? 'pause' : 'play'} tamanho={14} />
                </button>
                {faixa.capa_imagem && <img className={styles.miniCapa} src={faixa.capa_imagem} alt="" loading="lazy" />}
                <span className={styles.texto}>
                  <strong>{faixa.titulo}</strong>
                  <small>
                    {faixa.artista} · {faixa.album}
                  </small>
                </span>
                <span className={styles.duracao}>
                  {formatarDuracao(faixa.duracao_segundos)}
                  {faixa.preview_url && !servico.modoDemo && servico.modo !== 'conta' && <small className={styles.selo}>{t('busca.previa')}</small>}
                </span>
                <button type="button" className={styles.acao} onClick={() => adicionarStreamingNaFila(faixa)} aria-label={t('busca.adicionarFila', { titulo: faixa.titulo })} title={t('busca.adicionarFilaCurto')}>
                  <Icone nome="fila" tamanho={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
