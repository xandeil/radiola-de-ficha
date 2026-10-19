import { useState } from 'react';
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
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { exportarCsv } from '@/utils/exportarCsv';
import { anoDoItem } from '@/utils/formatadores';
import styles from './CatalogoPage.module.css';

/*
 * Catálogo: grade de fichas (RF013) com busca, filtros e exportação (RF016).
 *
 * Os filtros ficam na URL (?tipo=LP&busca=tim). Por quê?
 *  - Recarregar a página mantém o filtro.
 *  - Dá para mandar o link filtrado para alguém.
 *  - O botão "voltar" do navegador funciona como o usuário espera.
 */
export default function CatalogoPage() {
  const { tocarItem } = usePlayer();
  const [params, setParams] = useSearchParams();
  const [visao, setVisao] = useState('grade');

  const filtros = {
    busca: params.get('busca') || '',
    tipo: params.get('tipo') || '',
    local: params.get('local') || '',
    ordem: params.get('ordem') || 'recentes',
  };
  const buscaAtrasada = useDebounce(filtros.busca);

  const { dados: itens, carregando, erro, recarregar } = useCarregar(
    () => catalogoService.listar({ ...filtros, busca: buscaAtrasada }),
    [buscaAtrasada, filtros.tipo, filtros.local, filtros.ordem],
  );
  const { dados: locais } = useCarregar(() => catalogoService.locais(), []);

  const atualizarFiltros = (novos) => {
    // Só coloca na URL o que tem valor, para ela não ficar "?busca=&tipo=&local="
    const limpos = Object.fromEntries(Object.entries(novos).filter(([k, v]) => v && !(k === 'ordem' && v === 'recentes')));
    setParams(limpos, { replace: true });
  };

  const temFiltro = filtros.busca || filtros.tipo || filtros.local;

  return (
    <>
      <TituloPagina
        titulo="Catálogo"
        subtitulo={itens ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}${temFiltro ? ' encontrados' : ' na coleção'}` : ' '}
        acoes={
          <>
            <Botao variante="secundario" para="/busca" icone={<Icone nome="busca" />} aria-label="Buscar na coleção e no Spotify">
              Buscar
            </Botao>
            <Botao variante="secundario" icone={<Icone nome="download" />} onClick={() => exportarCsv(itens)} disabled={!itens?.length}>
              Exportar CSV
            </Botao>
            <Botao para="/catalogo/novo" icone={<Icone nome="mais" />}>
              Adicionar
            </Botao>
          </>
        }
      />

      <FiltrosCatalogo filtros={filtros} locais={locais || []} aoMudar={atualizarFiltros} />

      <div className={styles.barra}>
        <div className={styles.alternador} role="group" aria-label="Modo de visualização">
          <button type="button" aria-pressed={visao === 'grade'} onClick={() => setVisao('grade')}>
            Fichas
          </button>
          <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>
            Lista
          </button>
        </div>
        {temFiltro && (
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => setParams({}, { replace: true })}>
            Limpar filtros
          </Botao>
        )}
      </div>

      {carregando && !itens ? (
        <Carregando />
      ) : erro ? (
        <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />
      ) : itens.length === 0 ? (
        temFiltro ? (
          <EstadoVazio titulo="Nada encontrado" mensagem="Tente outro termo ou limpe os filtros." />
        ) : (
          <EstadoVazio
            titulo="Nenhum item ainda"
            mensagem="Comece cadastrando um LP, CD, DVD ou fita K7."
            acao={<Botao para="/catalogo/novo">Cadastrar item</Botao>}
          />
        )
      ) : visao === 'grade' ? (
        <div className={`${styles.grade} ${carregando ? styles.atualizando : ''}`}>
          {itens.map((item) => (
            <FichaItem key={item.id} item={item} aoTocar={tocarItem} />
          ))}
        </div>
      ) : (
        <div className={`${styles.tabelaContainer} ${carregando ? styles.atualizando : ''}`}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Capa</span></th>
                <th scope="col">Título</th>
                <th scope="col">Artista</th>
                <th scope="col">Formato</th>
                <th scope="col">Ano</th>
                <th scope="col">Localização</th>
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
