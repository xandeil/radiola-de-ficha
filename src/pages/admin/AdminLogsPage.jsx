import { useState } from 'react';
import { useCarregar } from '@/hooks/useCarregar';
import { adminService } from '@/services/adminService';
import TituloPagina from '@/components/ui/TituloPagina';
import { Selecao } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela from '@/components/ui/Tabela';
import styles from './Admin.module.css';

/*
 * Log de auditoria (seção 10.2): QUEM fez O QUÊ, QUANDO, e como estava ANTES e DEPOIS.
 * É só leitura — nenhuma tela (nem do superadmin) apaga log de auditoria.
 */

const GRUPOS = [
  { valor: 'usuario', rotulo: 'Usuários' },
  { valor: 'ticket', rotulo: 'Tickets' },
  { valor: 'automacao', rotulo: 'Automações' },
  { valor: 'transacao', rotulo: 'Financeiro' },
  { valor: 'backup', rotulo: 'Backup' },
  { valor: 'manutencao', rotulo: 'Manutenção' },
];

const mostrarJson = (v) => (v ? JSON.stringify(v) : '');

export default function AdminLogsPage() {
  const [acao, setAcao] = useState('');
  const { dados, carregando, erro, recarregar } = useCarregar(() => adminService.logs({ acao }), [acao]);

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="Auditoria" subtitulo="Registro permanente de tudo que a equipe fez." />
      <div className={styles.filtros}>
        <Selecao aria-label="Tipo de ação" vazio="Todas as ações" opcoes={GRUPOS} value={acao} onChange={(e) => setAcao(e.target.value)} />
      </div>
      {erro ? (
        <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />
      ) : carregando && !dados ? (
        <Carregando />
      ) : (
        <Tabela
          legenda="Log de auditoria"
          dados={dados}
          vazio="Nenhuma ação registrada ainda."
          colunas={[
            { titulo: 'Quando', render: (l) => new Date(l.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) },
            { titulo: 'Quem', render: (l) => l.usuario?.nome || 'sistema' },
            { titulo: 'Ação', render: (l) => <span className={styles.mono}>{l.acao}</span> },
            { titulo: 'Recurso', render: (l) => `${l.tipo_recurso}${l.recurso_id ? ` #${l.recurso_id}` : ''}` },
            {
              titulo: 'Detalhes',
              render: (l) => (
                <>
                  {l.observacao && <div>{l.observacao}</div>}
                  {(l.dados_antes || l.dados_depois) && (
                    <p className={styles.json}>
                      {mostrarJson(l.dados_antes)} → {mostrarJson(l.dados_depois)}
                    </p>
                  )}
                </>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
