import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { adminService } from '@/services/adminService';
import { STATUS_TICKET } from '@/services/suporteService';
import { TOM_STATUS, rotuloCategoria } from '@/pages/suporte/SuportePage';
import TituloPagina from '@/components/ui/TituloPagina';
import { Caixa, Selecao } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

export const PRIORIDADES = [
  { valor: 'urgente', rotulo: 'Urgente' },
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'baixa', rotulo: 'Baixa' },
];
export const TOM_PRIORIDADE = { urgente: 'erro', alta: 'aviso', media: 'neutro', baixa: 'neutro' };
export const rotuloPrioridade = (v) => PRIORIDADES.find((p) => p.valor === v)?.rotulo || v;

/*
 * Fila de atendimento (seção 9.5). A ordem vem pronta do serviço:
 * não resolvidos primeiro → maior prioridade → quem espera há mais tempo.
 * Assim o agente sempre pega "o de cima", sem precisar pensar.
 */
export default function AdminTicketsPage() {
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState({ status: '', prioridade: '', meus: false });
  const { dados, carregando, erro, recarregar } = useCarregar(() => adminService.tickets(filtros), [filtros]);
  const mudar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="Tickets de suporte" subtitulo="Fila ordenada por prioridade e tempo de espera." />
      <div className={styles.filtros}>
        <Selecao aria-label="Situação" vazio="Todas as situações" opcoes={Object.entries(STATUS_TICKET).map(([valor, rotulo]) => ({ valor, rotulo }))} value={filtros.status} onChange={mudar('status')} />
        <Selecao aria-label="Prioridade" vazio="Todas as prioridades" opcoes={PRIORIDADES} value={filtros.prioridade} onChange={mudar('prioridade')} />
        <Caixa rotulo="Só os meus" checked={filtros.meus} onChange={mudar('meus')} />
      </div>
      {erro ? (
        <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />
      ) : carregando && !dados ? (
        <Carregando />
      ) : (
        <Tabela
          legenda="Fila de tickets"
          dados={dados}
          vazio="Nenhum ticket com esses filtros. 🎉"
          aoClicarLinha={(t) => navegar(`/admin/tickets/${t.id}`)}
          colunas={[
            { titulo: 'Nº', render: (t) => `#${t.id}` },
            { titulo: 'Assunto', render: (t) => (<><strong>{t.assunto}</strong><br /><span className={styles.muted}>{t.usuario?.nome} · {rotuloCategoria(t.categoria)}</span></>) },
            { titulo: 'Prioridade', render: (t) => <Etiqueta tom={TOM_PRIORIDADE[t.prioridade]}>{rotuloPrioridade(t.prioridade)}</Etiqueta> },
            { titulo: 'Situação', render: (t) => <Etiqueta tom={TOM_STATUS[t.status]}>{STATUS_TICKET[t.status]}</Etiqueta> },
            { titulo: 'Responsável', render: (t) => t.agente?.nome || <span className={styles.muted}>ninguém</span> },
            { titulo: 'Aberto', render: (t) => tempoRelativo(t.data_abertura) },
          ]}
        />
      )}
    </>
  );
}
