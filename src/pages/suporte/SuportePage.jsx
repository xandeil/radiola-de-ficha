import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { suporteService, STATUS_TICKET, CATEGORIAS_TICKET } from '@/services/suporteService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { Entrada } from '@/components/ui/Campo';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { Carregando, EstadoVazio } from '@/components/ui/Estados';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Suporte.module.css';

/*
 * Central de ajuda (seção 9.5): primeiro a base de conhecimento, depois o ticket.
 * Ordem proposital: muita dúvida se resolve num artigo, o que é mais rápido
 * para o usuário e mais barato para a equipe ("ticket deflection").
 */

export const TOM_STATUS = { aberto: 'info', respondido: 'aviso', aguardando_usuario: 'aviso', resolvido: 'sucesso', fechado: 'neutro' };
export const rotuloCategoria = (v) => CATEGORIAS_TICKET.find((c) => c.valor === v)?.rotulo || v;

export default function SuportePage() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useDebounce(busca);
  const artigos = useCarregar(() => suporteService.artigos(buscaAtrasada), [buscaAtrasada]);
  const tickets = useCarregar(() => suporteService.meusTickets(), []);

  return (
    <>
      <TituloPagina titulo="Ajuda e suporte" subtitulo="Procure uma resposta ou fale com a equipe." acoes={<Botao para="/suporte/novo" icone={<Icone nome="mais" />}>Abrir ticket</Botao>} />

      <div className={styles.busca} role="search">
        <Entrada type="search" aria-label="Buscar na ajuda" placeholder="Ex.: Pix, scanner, cancelar, backup..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <section className={styles.secao}>
        <h2>{buscaAtrasada ? 'Resultados' : 'Artigos mais lidos'}</h2>
        {artigos.carregando && !artigos.dados ? (
          <Carregando />
        ) : artigos.dados?.length === 0 ? (
          <EstadoVazio titulo="Nenhum artigo encontrado" mensagem="Abra um ticket que a equipe responde." acao={<Botao para="/suporte/novo">Abrir ticket</Botao>} />
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
        <h2>Meus tickets</h2>
        {tickets.carregando ? (
          <Carregando />
        ) : (
          <Tabela
            dados={tickets.dados}
            vazio="Você ainda não abriu nenhum ticket."
            legenda="Meus tickets"
            aoClicarLinha={(t) => navegar(`/suporte/tickets/${t.id}`)}
            colunas={[
              { titulo: 'Nº', render: (t) => <Link to={`/suporte/tickets/${t.id}`} onClick={(e) => e.stopPropagation()}>#{t.id}</Link> },
              { titulo: 'Assunto', campo: 'assunto' },
              { titulo: 'Categoria', render: (t) => rotuloCategoria(t.categoria) },
              { titulo: 'Situação', render: (t) => <Etiqueta tom={TOM_STATUS[t.status]}>{STATUS_TICKET[t.status]}</Etiqueta> },
              { titulo: 'Atualizado', render: (t) => tempoRelativo(t.data_atualizacao) },
            ]}
          />
        )}
      </section>
    </>
  );
}
