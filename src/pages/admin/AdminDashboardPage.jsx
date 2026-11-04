import { Link } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { adminService } from '@/services/adminService';
import TituloPagina from '@/components/ui/TituloPagina';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Alerta from '@/components/ui/Alerta';
import GraficoBarras from '@/components/admin/GraficoBarras';
import { formatarMoeda, tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

/*
 * Visão geral (seção 10 – dashboards).
 *
 * Escolha de forma: a maioria das perguntas aqui é "quanto?" — e para
 * isso um NÚMERO grande é melhor que qualquer gráfico. Só usamos barras
 * onde a pergunta é "como se distribui?" (cadastros por dia, usuários por plano).
 */

const pct = (v) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const diaCurto = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function AdminDashboardPage() {
  const { dados: d, carregando, erro, recarregar } = useCarregar(() => adminService.dashboard(), []);

  if (carregando && !d) return <Carregando texto="Somando os números..." />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="Visão geral" subtitulo="Como a Radiola está hoje." />

      {d.manutencao && (
        <Alerta tipo="aviso" titulo="Modo manutenção ligado">
          Clientes estão vendo a página de manutenção. <Link to="/admin/manutencao">Gerenciar</Link>
        </Alerta>
      )}

      <div className={styles.blocos}>
        <Bloco rotulo="Usuários" valor={d.totalUsuarios} extra={`${d.ativos30} ${d.ativos30 === 1 ? 'ativo' : 'ativos'} nos últimos 30 dias`} para="/admin/usuarios" />
        <Bloco rotulo="Assinantes" valor={d.pagantes} extra={`${d.totalUsuarios ? pct(d.pagantes / d.totalUsuarios) : '0%'} da base`} />
        <Bloco rotulo="Receita mensal (MRR)" valor={formatarMoeda(d.mrr)} extra="anuais contam valor ÷ 12" />
        <Bloco rotulo="Cancelamentos (30d)" valor={pct(d.churn30)} extra="churn de assinantes" />
        <Bloco rotulo="Itens catalogados" valor={d.itens.toLocaleString('pt-BR')} />
        <Bloco rotulo="Tickets em aberto" valor={d.ticketsAbertos} extra={`${d.ticketsSemAgente} sem responsável`} para="/admin/tickets" />
        <Bloco rotulo="Satisfação (CSAT)" valor={d.csat ? `${d.csat.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} / 5` : '—'} extra="média das avaliações" />
        <Bloco rotulo="Anúncios (CTR)" valor={pct(d.ctr)} extra={`${d.cliques} cliques em ${d.impressoes} exibições`} />
      </div>

      <div className={styles.graficos}>
        <GraficoBarras titulo="Cadastros por dia (últimos 14 dias)" dados={d.cadastros} rotulo={(c) => diaCurto(c.dia)} valor={(c) => c.total} />
        <GraficoBarras titulo="Usuários por plano" dados={d.porPlano} rotulo={(p) => p.nome} valor={(p) => p.total} horizontal />
      </div>

      <section className={styles.cartao}>
        <h2>Último backup</h2>
        {d.ultimoBackup ? (
          <p className={styles.muted}>
            {d.ultimoBackup.status === 'sucesso' ? '✔' : '✖'} {d.ultimoBackup.tipo_backup} · {tempoRelativo(d.ultimoBackup.data_inicio)} · {d.ultimoBackup.status}{' '}
            <Link to="/admin/backup">ver todos</Link>
          </p>
        ) : (
          <p className={styles.muted}>Nenhum backup registrado.</p>
        )}
      </section>
    </>
  );
}

function Bloco({ rotulo, valor, extra, para }) {
  const conteudo = (
    <>
      <small>{rotulo}</small>
      <strong>{valor}</strong>
      {extra && <span>{extra}</span>}
    </>
  );
  return para ? (
    <Link to={para} className={styles.bloco}>
      {conteudo}
    </Link>
  ) : (
    <div className={styles.bloco}>{conteudo}</div>
  );
}
