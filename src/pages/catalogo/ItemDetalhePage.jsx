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
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { anoDoItem, formatarData, formatarDuracao, formatarMoeda } from '@/utils/formatadores';
import styles from './ItemDetalhePage.module.css';

/*
 * A "ficha completa" de um item: dados, faixas, localização e ações.
 * Os detalhes que aparecem dependem do formato — montamos a lista
 * de pares [rótulo, valor] e filtramos os vazios, em vez de encher o
 * JSX de condicionais.
 */

function detalhesDoItem(item) {
  const comuns = [
    ['Formato', [item.tipo_midia, item.subtipo].filter(Boolean).join(' · ')],
    ['Gênero', item.genero],
    ['Ano', anoDoItem(item)],
    ['Gravadora', item.gravadora],
    ['País', item.pais_origem],
    ['Nº de catálogo', item.numero_catalogo],
    ['Código de barras', item.codigo_barras],
    ['Conservação', item.estado_conservacao],
    ['Capa', item.estado_capa],
  ];
  const especificos = {
    LP: [
      ['Velocidade', item.velocidade && `${item.velocidade} RPM`],
      ['Cor do vinil', item.cor_vinil],
    ],
    CD: [
      ['Discos', item.numero_discos],
      ['Encarte', item.paginas_encarte && `${item.paginas_encarte} páginas`],
      ['Matrix / SID', item.matrix_sid],
    ],
    DVD: [
      ['Região', item.regiao_dvd],
      ['Tela', item.formato_tela],
      ['Título original', item.titulo_original],
      ['Diretor', item.diretor],
      ['Duração', item.duracao_min && `${item.duracao_min} min`],
      ['Elenco', item.elenco],
    ],
    K7: [
      ['Duração', item.duracao_total_min && `${item.duracao_total_min} min (A: ${item.lado_a_duracao_min || '?'} / B: ${item.lado_b_duracao_min || '?'})`],
      ['Cor da fita', item.cor_fita],
      ['Digitalizada', item.digitalizada ? 'Sim' : 'Não'],
    ],
  };
  const valores = [
    ['Preço pago', item.preco_pago && formatarMoeda(item.preco_pago)],
    ['Valor estimado', item.valor_estimado && formatarMoeda(item.valor_estimado)],
  ];
  return [...comuns, ...(especificos[item.tipo_midia] || []), ...valores].filter(([, v]) => v);
}

export default function ItemDetalhePage() {
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
      <EstadoErro erro={{ message: 'Este item não existe ou não pertence à sua coleção.' }} />
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
        <Icone nome="voltar" tamanho={16} /> Catálogo
      </Link>

      <div className={styles.topo}>
        <div className={styles.capa}>
          <CapaMidia item={item} tamanho="grande" />
        </div>

        <div className={styles.cabecalho}>
          <span className={styles.formato}>{item.tipo_midia}{item.subtipo && ` · ${item.subtipo}`}</span>
          <h1 className={styles.titulo}>{item.titulo}</h1>
          <p className={styles.artista}>
            {item.artista}
            {anoDoItem(item) && ` · ${anoDoItem(item)}`}
          </p>

          <div className={styles.acoes}>
            {item.faixas?.length > 0 && (
              <Botao icone={<Icone nome="play" />} onClick={() => tocarItem(item)}>
                Tocar na vitrola
              </Botao>
            )}
            <Botao variante="secundario" para={`/catalogo/${item.id}/editar`} icone={<Icone nome="editar" />}>
              Editar
            </Botao>
            {/* RF018 – Duplicação rápida para itens parecidos */}
            <Botao variante="secundario" para={`/catalogo/novo?duplicar=${item.id}`}>
              Duplicar
            </Botao>
            <Botao variante="fantasma" icone={<Icone nome="lixo" />} onClick={() => setConfirmandoExclusao(true)}>
              Excluir
            </Botao>
          </div>

          <div className={styles.localizacao}>
            <Icone nome="local" />
            <div>
              <strong>{[local.local_principal, local.movel, local.prateleira].filter(Boolean).join(' › ') || 'Sem localização'}</strong>
              {local.posicao && <span>{local.posicao}</span>}
              {local.data_movimentacao && <small>Última movimentação em {formatarData(local.data_movimentacao)}</small>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.colunas}>
        <div>
          {item.tipo_midia === 'K7' && <PainelFita item={item} aoAtualizar={recarregar} />}
          <section className={styles.bloco}>
            <div className={styles.blocoCabecalho}>
              <h2>Faixas</h2>
              {item.faixas?.length > 0 && (
                <span className={styles.resumo}>
                  {item.faixas.length} faixas · {formatarDuracao(duracaoTotal)}
                </span>
              )}
            </div>

            {!item.faixas?.length ? (
              <p className={styles.semDados}>Nenhuma faixa cadastrada. <Link to={`/catalogo/${item.id}/editar`}>Adicionar faixas</Link></p>
            ) : (
              <ol className={styles.faixas}>
                {item.faixas.map((faixa, i) => {
                  const estaTocando = atual?.id === faixa.id && atual?.item.id === item.id;
                  return (
                    <li key={faixa.id} className={`${styles.faixa} ${estaTocando ? styles.faixaAtual : ''}`}>
                      <button type="button" className={styles.faixaPlay} onClick={() => tocarItem(item, i)} aria-label={`Tocar ${faixa.titulo}`}>
                        <span className={styles.faixaNumero}>{faixa.lado}{faixa.numero}</span>
                        <Icone nome={estaTocando && tocando ? 'pause' : 'play'} tamanho={14} />
                      </button>
                      <span className={styles.faixaTitulo}>
                        {faixa.titulo}
                        {arquivos[faixa.id] && <span className={styles.temArquivo} title="Arquivo de áudio vinculado">♪</span>}
                      </span>
                      <span className={styles.faixaDuracao}>{formatarDuracao(faixa.duracao_segundos)}</span>
                      <span className={styles.faixaAcoes}>
                        <button type="button" onClick={() => adicionarNaFila(item, faixa)} aria-label={`Adicionar ${faixa.titulo} à fila`} title="Adicionar à fila">
                          <Icone nome="fila" tamanho={16} />
                        </button>
                        <button type="button" onClick={() => escolherArquivo(faixa.id)} aria-label={`Vincular arquivo de áudio a ${faixa.titulo}`} title="Vincular arquivo de áudio">
                          <Icone nome="arquivo" tamanho={16} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className={styles.nota}>
              ♪ Vincule um MP3/FLAC digitalizado para ouvir de verdade. Sem arquivo, a vitrola roda em modo demonstração.
              (Nesta versão sem back-end o vínculo vale até recarregar a página.)
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
            <h2>Detalhes</h2>
            <dl className={styles.detalhes}>
              {detalhesDoItem(item).map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          {item.notas_pessoais && (
            <section className={styles.bloco}>
              <h2>Notas pessoais</h2>
              <p className={styles.notas}>{item.notas_pessoais}</p>
            </section>
          )}
        </aside>
      </div>

      <ModalConfirmacao
        aberto={confirmandoExclusao}
        titulo="Excluir item?"
        mensagem={`"${item.titulo}" e suas ${item.faixas?.length || 0} faixas serão removidos da coleção. Isso não pode ser desfeito.`}
        textoConfirmar="Excluir"
        perigo
        carregando={excluindo}
        aoConfirmar={excluir}
        aoFechar={() => setConfirmandoExclusao(false)}
      />
    </>
  );
}
