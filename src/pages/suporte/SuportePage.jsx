import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { suporteService, CATEGORIAS_TICKET } from '@/services/suporteService';
import { traduzirOu } from '@/i18n';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { Entrada } from '@/components/ui/Campo';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { Carregando, EstadoVazio } from '@/components/ui/Estados';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Suporte.module.css';
import { useI18n } from '@/contexts/I18nContext';

/*
 * Central de ajuda (seção 9.5): primeiro a base de conhecimento, depois o ticket.
 * Ordem proposital: muita dúvida se resolve num artigo, o que é mais rápido
 * para o usuário e mais barato para a equipe ("ticket deflection").
 */

export const TOM_STATUS = { aberto: 'info', respondido: 'aviso', aguardando_usuario: 'aviso', resolvido: 'sucesso', fechado: 'neutro' };
export const rotuloCategoria = (v) => traduzirOu(`suporte.categoria.${v}`, CATEGORIAS_TICKET.find((c) => c.valor === v)?.rotulo || v);

export default function SuportePage() {
  const navegar = useNavigate();
  const { t, idioma } = useI18n();
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useDebounce(busca);
  const artigos = useCarregar(() => suporteService.artigos(buscaAtrasada), [buscaAtrasada]);
  const tickets = useCarregar(() => suporteService.meusTickets(), []);

  return (
    <>
      <TituloPagina titulo={t('suporte.titulo')} subtitulo={t('suporte.subtitulo')} acoes={<Botao para="/suporte/novo" icone={<Icone nome="mais" />}>{t('suporte.abrirTicket')}</Botao>} />

      <div className={styles.busca} role="search">
        <Entrada type="search" aria-label={t('suporte.buscar')} placeholder={t('suporte.buscarPh')} value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <section className={styles.secao}>
        <h2>{buscaAtrasada ? t('suporte.resultados') : t('suporte.maisLidos')}</h2>
        {idioma !== 'pt-BR' && <p className={styles.trecho}>{t('suporte.artigosEmPt')}</p>}
        {artigos.carregando && !artigos.dados ? (
          <Carregando />
        ) : artigos.dados?.length === 0 ? (
          <EstadoVazio titulo={t('suporte.nenhumArtigo')} mensagem={t('suporte.nenhumArtigoTexto')} acao={<Botao para="/suporte/novo">{t('suporte.abrirTicket')}</Botao>} />
        ) : (
          <div className={styles.artigos}>
            {artigos.dados?.map((a) => (
              <Link key={a.id} to={`/suporte/artigos/${a.slug}`} className={styles.artigo}>
                <span className={styles.categoria}>{a.categoria}</span>
                <strong>{a.titulo}</strong>
                <span className={styles.trecho}>{a.conteudo.slice(0, 110)}…</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.secao}>
        <h2>{t('suporte.meusTickets')}</h2>
        {tickets.carregando ? (
          <Carregando />
        ) : (
          <Tabela
            dados={tickets.dados}
            vazio={t('suporte.semTickets')}
            legenda={t('suporte.meusTickets')}
            aoClicarLinha={(tk) => navegar(`/suporte/tickets/${tk.id}`)}
            colunas={[
              { titulo: t('suporte.col.numero'), render: (tk) => <Link to={`/suporte/tickets/${tk.id}`} onClick={(e) => e.stopPropagation()}>#{tk.id}</Link> },
              { titulo: t('suporte.col.assunto'), campo: 'assunto' },
              { titulo: t('suporte.col.categoria'), render: (tk) => rotuloCategoria(tk.categoria) },
              { titulo: t('suporte.col.situacao'), render: (tk) => <Etiqueta tom={TOM_STATUS[tk.status]}>{t(`suporte.status.${tk.status}`)}</Etiqueta> },
              { titulo: t('suporte.col.atualizado'), render: (tk) => tempoRelativo(tk.data_atualizacao) },
            ]}
          />
        )}
      </section>
    </>
  );
}
