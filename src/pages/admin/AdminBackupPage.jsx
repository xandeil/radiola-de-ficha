import { useState } from 'react';
import { useCarregar } from '@/hooks/useCarregar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { adminService } from '@/services/adminService';
import { temPermissao } from '@/utils/permissoes';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { formatarData, tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

/*
 * Backup (seção 7). Três ideias importantes que esta tela mostra:
 * 1. Regra 3-2-1: cópias diárias na nuvem + uma mensal IMUTÁVEL (ninguém apaga, nem um ransomware).
 * 2. Backup que nunca foi testado não é backup: o botão "Testar" confere o checksum.
 * 3. Falha precisa aparecer em vermelho no topo, não escondida na lista.
 */

const mb = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB` : `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
const duracao = (b) => {
  const s = Math.round((new Date(b.data_fim) - new Date(b.data_inicio)) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
};
const TOM_RESTAURACAO = { pendente: 'aviso', em_andamento: 'info', concluida: 'sucesso', falha: 'erro' };

export default function AdminBackupPage() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const { dados: d, carregando, erro, recarregar } = useCarregar(() => adminService.backups(), []);
  const [progresso, setProgresso] = useState(null);
  const [testando, setTestando] = useState(null);
  const [restaurando, setRestaurando] = useState(null);
  const podeExecutar = temPermissao(usuario, 'backup.executar');

  if (carregando && !d) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const falhasRecentes = d.backups.filter((b) => b.status === 'falha' && Date.now() - new Date(b.data_inicio) < 14 * 86400000);

  const executar = async () => {
    setProgresso({ passo: 0, total: 8, descricao: 'Preparando', feitos: [] });
    try {
      const r = await adminService.executarBackup((p) => setProgresso((atual) => ({ ...p, feitos: [...(atual?.feitos || []), atual?.descricao].filter(Boolean).slice(1) })));
      mostrar(`Backup ${r.arquivo_nome} concluído`);
      recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setProgresso(null);
    }
  };

  const testar = async (b) => {
    setTestando(b.id);
    try {
      const r = await adminService.testarBackup(b.id);
      mostrar(`${r.ok ? '✔' : '✖'} ${r.mensagem}`, { tipo: r.ok ? 'sucesso' : 'erro' });
    } finally {
      setTestando(null);
    }
  };

  const restaurar = async (s) => {
    setRestaurando(s.id);
    try {
      const r = await adminService.executarRestauracao(s.id);
      mostrar(r.resultado);
      recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <>
      <TituloPagina
        sobretitulo="Painel"
        titulo="Backup"
        subtitulo="Diário às 3h, 30 dias de retenção, cópia mensal imutável."
        acoes={podeExecutar && <Botao carregando={Boolean(progresso)} onClick={executar}>Fazer backup agora</Botao>}
      />

      {falhasRecentes.length > 0 && (
        <Alerta tipo="erro" titulo={`${falhasRecentes.length} backup falhou nas últimas 2 semanas`}>
          {falhasRecentes[0].log_erro} ({formatarData(falhasRecentes[0].data_inicio)})
        </Alerta>
      )}

      {progresso && (
        <section className={styles.cartao} aria-live="polite">
          <h2>Backup em andamento…</h2>
          <div className={styles.progresso} role="progressbar" aria-valuemin={0} aria-valuemax={progresso.total} aria-valuenow={progresso.passo}>
            <span style={{ width: `${(progresso.passo / progresso.total) * 100}%` }} />
          </div>
          <ol className={styles.passos}>
            {progresso.feitos.map((f) => (
              <li key={f} data-estado="feito">✔ {f}</li>
            ))}
            <li data-estado="atual">● {progresso.descricao}</li>
          </ol>
        </section>
      )}

      <section className={styles.cartao}>
        <h2>Solicitações de restauração</h2>
        <Tabela
          legenda="Solicitações de restauração"
          dados={d.solicitacoes}
          vazio="Nenhum usuário pediu restauração."
          colunas={[
            { titulo: 'Pedido', render: (s) => tempoRelativo(s.data_solicitacao) },
            { titulo: 'Usuário', render: (s) => s.usuario?.nome },
            { titulo: 'Backup de', render: (s) => (s.backup ? formatarData(s.backup.data_inicio) : '—') },
            { titulo: 'Status', render: (s) => <Etiqueta tom={TOM_RESTAURACAO[s.status]}>{s.status}</Etiqueta> },
            {
              titulo: 'Ações',
              render: (s) =>
                s.status === 'pendente' && podeExecutar ? (
                  <Botao variante="secundario" tamanho="pequeno" carregando={restaurando === s.id} onClick={() => restaurar(s)}>Restaurar</Botao>
                ) : (
                  <span className={styles.muted}>{s.resultado || ''}</span>
                ),
            },
          ]}
        />
      </section>

      <section className={styles.cartao}>
        <h2>Histórico</h2>
        <Tabela
          legenda="Histórico de backups"
          dados={d.backups}
          colunas={[
            { titulo: 'Data', render: (b) => new Date(b.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) },
            { titulo: 'Arquivo', render: (b) => (<><span className={styles.mono}>{b.arquivo_nome}</span>{b.manual && <> <Etiqueta tom="info">manual</Etiqueta></>}</>) },
            { titulo: 'Destino', render: (b) => (b.destino === 'imutavel' ? <Etiqueta tom="info">imutável</Etiqueta> : b.destino) },
            { titulo: 'Tamanho', render: (b) => mb(b.tamanho_bytes), alinhar: 'direita' },
            { titulo: 'Duração', render: duracao, alinhar: 'direita' },
            { titulo: 'Status', render: (b) => <Etiqueta tom={b.status === 'sucesso' ? 'sucesso' : 'erro'}>{b.status}</Etiqueta> },
            {
              titulo: 'Ações',
              render: (b) =>
                b.status === 'sucesso' ? (
                  <Botao variante="fantasma" tamanho="pequeno" carregando={testando === b.id} onClick={() => testar(b)}>Testar</Botao>
                ) : null,
            },
          ]}
        />
      </section>
    </>
  );
}
