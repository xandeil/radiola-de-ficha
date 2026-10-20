import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { catalogoService } from '@/services/catalogoService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import FichaItem from '@/components/catalogo/FichaItem';
import FiltrosCatalogo from '@/components/catalogo/FiltrosCatalogo';
import CapaMidia from '@/components/catalogo/CapaMidia';
import { CardPatrocinado } from '@/components/publicidade/Anuncio';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { exportarCsv } from '@/utils/exportarCsv';
import { anoDoItem } from '@/utils/formatadores';
import styles from './CatalogoPage.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Catálogo: grade de fichas (RF013) com busca, filtros e exportação (RF016).
 *
 * Os filtros ficam na URL (?tipo=LP&busca=tim). Por quê?
 *  - Recarregar a página mantém o filtro.
 *  - Dá para mandar o link filtrado para alguém.
 *  - O botão "voltar" do navegador funciona como o usuário espera.
 */
export default function CatalogoPage() {
  const t = useT();
  const { tocarItem } = usePlayer();
  const [params, setParams] = useSearchParams();
  const [visao, setVisao] = useState('grade');

  const filtros = {
    busca: params.get('busca') || '',
    tipo: params.get('tipo') || '',
    local: params.get('local') || '',
    digitalizada: params.get('tipo') === 'K7' ? params.get('digitalizada') || '' : '',
    ordem: params.get('ordem') || 'recentes',
  };
  const buscaAtrasada = useDebounce(filtros.busca);

  const { dados: itens, carregando, erro, recarregar } = useCarregar(
    () => catalogoService.listar({ ...filtros, busca: buscaAtrasada }),
    [buscaAtrasada, filtros.tipo, filtros.local, filtros.digitalizada, filtros.ordem],
  );
  const { dados: locais } = useCarregar(() => catalogoService.locais(), []);

  const atualizarFiltros = (novos) => {
    // Só coloca na URL o que tem valor, para ela não ficar "?busca=&tipo=&local="
    const limpos = Object.fromEntries(Object.entries(novos).filter(([k, v]) => v && !(k === 'ordem' && v === 'recentes')));
    setParams(limpos, { replace: true });
  };

  const temFiltro = filtros.busca || filtros.tipo || filtros.local || filtros.digitalizada;

  return (
    <>
      <TituloPagina
        titulo={t('catalogo.titulo')}
        subtitulo={itens ? t(temFiltro ? 'catalogo.encontrados' : 'catalogo.naColecao', { count: itens.length }) : ' '}
        acoes={
          <>
            <Botao variante="secundario" para="/scanner" icone={<Icone nome="codigo" />}>
              {t('catalogo.escanear')}
            </Botao>
            <Botao variante="secundario" para="/busca" icone={<Icone nome="busca" />} aria-label={t('catalogo.buscarAria')}>
              {t('catalogo.buscar')}
            </Botao>
            <Botao variante="secundario" icone={<Icone nome="download" />} onClick={() => exportarCsv(itens)} disabled={!itens?.length}>
              {t('catalogo.exportar')}
            </Botao>
            <Botao para="/catalogo/novo" icone={<Icone nome="mais" />}>
              {t('catalogo.adicionar')}
            </Botao>
          </>
        }
      />

      <FiltrosCatalogo filtros={filtros} locais={locais || []} aoMudar={atualizarFiltros} />

      <div className={styles.barra}>
        <div className={styles.alternador} role="group" aria-label={t('catalogo.modoVisao')}>
          <button type="button" aria-pressed={visao === 'grade'} onClick={() => setVisao('grade')}>
            {t('catalogo.fichas')}
          </button>
          <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>
            {t('catalogo.lista')}
          </button>
        </div>
        {temFiltro && (
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => setParams({}, { replace: true })}>
            {t('catalogo.limparFiltros')}
          </Botao>
        )}
      </div>

      {carregando && !itens ? (
        <Carregando />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />
      ) : itens.length === 0 ? (
        temFiltro ? (
          <EstadoVazio titulo={t('catalogo.nadaTitulo')} mensagem={t('catalogo.nadaTexto')} />
        ) : (
          <EstadoVazio
            titulo={t('catalogo.vazioTitulo')}
            mensagem={t('catalogo.vazioTexto')}
            acao={<Botao para="/catalogo/novo">{t('catalogo.vazioAcao')}</Botao>}
          />
        )
      ) : visao === 'grade' ? (
        <div className={`${styles.grade} ${carregando ? styles.atualizando : ''}`}>
          {itens.map((item, i) => (
            <Fragment key={item.id}>
              {/* Card patrocinado depois da 4ª ficha (só no plano gratuito; o componente decide) */}
              {i === 4 && <CardPatrocinado pagina="/catalogo" contexto={{ formato: filtros.tipo }} />}
              <FichaItem item={item} aoTocar={tocarItem} />
            </Fragment>
          ))}
        </div>
      ) : (
        <div className={`${styles.tabelaContainer} ${carregando ? styles.atualizando : ''}`}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">{t('catalogo.col.capa')}</span></th>
                <th scope="col">{t('catalogo.col.titulo')}</th>
                <th scope="col">{t('catalogo.col.artista')}</th>
                <th scope="col">{t('catalogo.col.formato')}</th>
                <th scope="col">{t('catalogo.col.ano')}</th>
                <th scope="col">{t('catalogo.col.local')}</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className={styles.colCapa}><CapaMidia item={item} tamanho="pequeno" /></td>
                  <td><Link to={`/catalogo/${item.id}`}>{item.titulo}</Link></td>
                  <td>{item.artista}</td>
                  <td><span className={styles.etiqueta}>{item.tipo_midia}</span></td>
                  <td>{anoDoItem(item) || '—'}</td>
                  <td className={styles.colLocal}>
                    {[item.localizacao?.local_principal, item.localizacao?.movel, item.localizacao?.prateleira].filter(Boolean).join(' › ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
