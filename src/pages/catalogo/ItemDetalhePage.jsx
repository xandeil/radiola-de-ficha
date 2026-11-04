import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCarregar } from '@/hooks/useCarregar';
import { catalogoService } from '@/services/catalogoService';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { ModalConfirmacao } from '@/components/ui/Modal';
import CapaMidia from '@/components/catalogo/CapaMidia';
import EncartePainel from '@/components/encarte/EncartePainel';
import PainelFita from '@/components/catalogo/PainelFita';
import OndeComprar from '@/components/publicidade/OndeComprar';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { anoDoItem, formatarData, formatarDuracao, formatarMoeda } from '@/utils/formatadores';
import styles from './ItemDetalhePage.module.css';
import { useT } from '@/contexts/I18nContext';
import { rotuloDominio } from '@/i18n/dominio';

/*
 * A "ficha completa" de um item: dados, faixas, localização e ações.
 * Os detalhes que aparecem dependem do formato — montamos a lista
 * de pares [rótulo, valor] e filtramos os vazios, em vez de encher o
 * JSX de condicionais.
 */

function detalhesDoItem(item, t) {
  const comuns = [
    [t('campo.formato'), [rotuloDominio('tipo', item.tipo_midia), rotuloDominio('subtipo', item.subtipo)].filter(Boolean).join(' · ')],
    [t('campo.genero'), item.genero],
    [t('campo.ano'), anoDoItem(item)],
    [t('campo.gravadora'), item.gravadora],
    [t('campo.pais'), item.pais_origem],
    [t('campo.numeroCatalogo'), item.numero_catalogo],
    [t('campo.codigoBarras'), item.codigo_barras],
    [t('campo.conservacao'), rotuloDominio('conservacao', item.estado_conservacao)],
    [t('campo.capa'), rotuloDominio('conservacao', item.estado_capa)],
  ];
  const especificos = {
    LP: [
      [t('campo.velocidade'), item.velocidade && `${item.velocidade} RPM`],
      [t('campo.corVinil'), item.cor_vinil],
    ],
    CD: [
      [t('campo.discos'), item.numero_discos],
      [t('campo.encarte'), item.paginas_encarte && t('campo.paginas', { n: item.paginas_encarte })],
      [t('campo.matrix'), item.matrix_sid],
    ],
    DVD: [
      [t('campo.regiao'), item.regiao_dvd],
      [t('campo.tela'), item.formato_tela],
      [t('campo.tituloOriginal'), item.titulo_original],
      [t('campo.diretor'), item.diretor],
      [t('campo.duracao'), item.duracao_min && `${item.duracao_min} min`],
      [t('campo.elenco'), item.elenco],
    ],
    K7: [
      [t('campo.duracao'), item.duracao_total_min && `${item.duracao_total_min} min (A: ${item.lado_a_duracao_min || '?'} / B: ${item.lado_b_duracao_min || '?'})`],
      [t('campo.corFita'), item.cor_fita],
      [t('campo.digitalizada'), item.digitalizada ? t('item.sim') : t('item.nao')],
    ],
  };
  const valores = [
    [t('campo.precoPago'), item.preco_pago && formatarMoeda(item.preco_pago)],
    [t('campo.valorEstimado'), item.valor_estimado && formatarMoeda(item.valor_estimado)],
  ];
  return [...comuns, ...(especificos[item.tipo_midia] || []), ...valores].filter(([, v]) => v);
}

export default function ItemDetalhePage() {
  const t = useT();
  const { id } = useParams();
  const navegar = useNavigate();
  const { tocarItem, adicionarNaFila, vincularArquivo, arquivos, atual, tocando } = usePlayer();
  const { dados: item, carregando, erro, recarregar } = useCarregar(() => catalogoService.buscarPorId(id), [id]);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const inputArquivo = useRef(null);
  const faixaParaArquivo = useRef(null);

  // Só mostra o carregando cheio na PRIMEIRA carga; recargas mantêm a tela (sem piscar)
  if (carregando && !item) return <Carregando />;
  if (erro) {
    return erro.status === 404 ? (
      <EstadoErro erro={{ message: t('item.naoExiste') }} />
    ) : (
      <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />
    );
  }

  const excluir = async () => {
    setExcluindo(true);
    await catalogoService.excluir(item.id);
    navegar('/catalogo', { replace: true });
  };

  const escolherArquivo = (faixaId) => {
    faixaParaArquivo.current = faixaId;
    inputArquivo.current.click();
  };

  const aoEscolherArquivo = (e) => {
    const arquivo = e.target.files?.[0];
    if (arquivo && faixaParaArquivo.current) vincularArquivo(faixaParaArquivo.current, arquivo);
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
  };

  const local = item.localizacao || {};
  // Se uma faixa deste disco está tocando, o encarte mostra também a aba "Faixa"
  const faixaTocando = atual?.fonte === 'local' && atual.item.id === item.id ? atual : null;
  const duracaoTotal = (item.faixas || []).reduce((s, f) => s + (f.duracao_segundos || 0), 0);

  return (
    <>
      <Link to="/catalogo" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} /> {t('item.catalogo')}
      </Link>

      <div className={styles.topo}>
        <div className={styles.capa}>
          <CapaMidia item={item} tamanho="grande" />
        </div>

        <div className={styles.cabecalho}>
          <span className={styles.formato}>{item.tipo_midia}{item.subtipo && ` · ${rotuloDominio('subtipo', item.subtipo)}`}</span>
          <h1 className={styles.titulo}>{item.titulo}</h1>
          <p className={styles.artista}>
            {item.artista}
            {anoDoItem(item) && ` · ${anoDoItem(item)}`}
          </p>

          <div className={styles.acoes}>
            {item.faixas?.length > 0 && (
              <Botao icone={<Icone nome="play" />} onClick={() => tocarItem(item)}>
                {t('item.tocar')}
              </Botao>
            )}
            <Botao variante="secundario" para={`/catalogo/${item.id}/editar`} icone={<Icone nome="editar" />}>
              {t('item.editar')}
            </Botao>
            {/* RF018 – Duplicação rápida para itens parecidos */}
            <Botao variante="secundario" para={`/catalogo/novo?duplicar=${item.id}`}>
              {t('item.duplicar')}
            </Botao>
            <Botao variante="fantasma" icone={<Icone nome="lixo" />} onClick={() => setConfirmandoExclusao(true)}>
              {t('item.excluir')}
            </Botao>
          </div>

          <div className={styles.localizacao}>
            <Icone nome="local" />
            <div>
              <strong>{[local.local_principal, local.movel, local.prateleira].filter(Boolean).join(' › ') || t('item.semLocal')}</strong>
              {local.posicao && <span>{local.posicao}</span>}
              {local.data_movimentacao && <small>{t('item.ultimaMov', { data: formatarData(local.data_movimentacao) })}</small>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.colunas}>
        <div>
          {item.tipo_midia === 'K7' && <PainelFita item={item} aoAtualizar={recarregar} />}
          <section className={styles.bloco}>
            <div className={styles.blocoCabecalho}>
              <h2>{t('item.faixas')}</h2>
              {item.faixas?.length > 0 && (
                <span className={styles.resumo}>
                  {t('item.resumoFaixas', { n: item.faixas.length, duracao: formatarDuracao(duracaoTotal) })}
                </span>
              )}
            </div>

            {!item.faixas?.length ? (
              <p className={styles.semDados}>{t('item.semFaixas')} <Link to={`/catalogo/${item.id}/editar`}>{t('item.adicionarFaixas')}</Link></p>
            ) : (
              <ol className={styles.faixas}>
                {item.faixas.map((faixa, i) => {
                  const estaTocando = atual?.id === faixa.id && atual?.item.id === item.id;
                  return (
                    <li key={faixa.id} className={`${styles.faixa} ${estaTocando ? styles.faixaAtual : ''}`}>
                      <button type="button" className={styles.faixaPlay} onClick={() => tocarItem(item, i)} aria-label={t('item.tocarFaixa', { titulo: faixa.titulo })}>
                        <span className={styles.faixaNumero}>{faixa.lado}{faixa.numero}</span>
                        <Icone nome={estaTocando && tocando ? 'pause' : 'play'} tamanho={14} />
                      </button>
                      <span className={styles.faixaTitulo}>
                        {faixa.titulo}
                        {arquivos[faixa.id] && <span className={styles.temArquivo} title={t('item.arquivoVinculado')}>♪</span>}
                      </span>
                      <span className={styles.faixaDuracao}>{formatarDuracao(faixa.duracao_segundos)}</span>
                      <span className={styles.faixaAcoes}>
                        <button type="button" onClick={() => adicionarNaFila(item, faixa)} aria-label={t('item.addFilaAria', { titulo: faixa.titulo })} title={t('item.addFila')}>
                          <Icone nome="fila" tamanho={16} />
                        </button>
                        <button type="button" onClick={() => escolherArquivo(faixa.id)} aria-label={t('item.vincularAria', { titulo: faixa.titulo })} title={t('item.vincular')}>
                          <Icone nome="arquivo" tamanho={16} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className={styles.nota}>
              {t('item.notaArquivo')}
            </p>
            <input ref={inputArquivo} type="file" accept="audio/*" hidden onChange={aoEscolherArquivo} />
          </section>
        </div>

        <aside>
          <EncartePainel
            item={item}
            artista={item.artista}
            album={item.tipo_midia === 'K7' && item.subtipo === 'Gravação Caseira' ? null : item.titulo}
            faixa={faixaTocando?.titulo}
            faixaId={faixaTocando?.id}
          />

          <section className={styles.bloco}>
            <h2>{t('item.detalhes')}</h2>
            <dl className={styles.detalhes}>
              {detalhesDoItem(item, t).map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          <OndeComprar titulo={item.titulo} artista={item.artista} referencia={`item:${item.id}`} />

          {item.notas_pessoais && (
            <section className={styles.bloco}>
              <h2>{t('item.notas')}</h2>
              <p className={styles.notas}>{item.notas_pessoais}</p>
            </section>
          )}
        </aside>
      </div>

      <ModalConfirmacao
        aberto={confirmandoExclusao}
        titulo={t('item.excluirTitulo')}
        mensagem={t('item.excluirMsg', { titulo: item.titulo, n: item.faixas?.length || 0 })}
        textoConfirmar={t('item.excluir')}
        perigo
        carregando={excluindo}
        aoConfirmar={excluir}
        aoFechar={() => setConfirmandoExclusao(false)}
      />
    </>
  );
}
