import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { adminService } from '@/services/adminService';
import TituloPagina from '@/components/ui/TituloPagina';
import { Entrada } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

export default function AdminUsuariosPage() {
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const termo = useDebounce(busca, 300);
  const { dados, carregando, erro, recarregar } = useCarregar(() => adminService.usuarios(termo), [termo]);

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="Usuários" subtitulo="Clique numa linha para ver o perfil completo." />
      <div className={styles.filtros}>
        <Entrada aria-label="Buscar usuário" placeholder="Nome, e-mail ou apelido" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {erro ? (
        <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />
      ) : carregando && !dados ? (
        <Carregando />
      ) : (
        <Tabela
          legenda="Usuários"
          dados={dados}
          aoClicarLinha={(u) => navegar(`/admin/usuarios/${u.id}`)}
          colunas={[
            { titulo: 'Nome', render: (u) => (<><strong>{u.nome}</strong><br /><span className={styles.muted}>{u.email}</span></>) },
            { titulo: 'Plano', render: (u) => <Etiqueta tom={u.plano === 'gratuito' ? 'neutro' : 'info'}>{u.plano}</Etiqueta> },
            { titulo: 'Papel', render: (u) => u.papeis.join(', ') || 'Usuário' },
            { titulo: 'Itens', campo: 'itens', alinhar: 'direita' },
            { titulo: 'Último acesso', render: (u) => (u.ultimo_login ? tempoRelativo(u.ultimo_login) : '—') },
            { titulo: 'Situação', render: (u) => <Etiqueta tom={u.ativo ? 'sucesso' : 'erro'}>{u.ativo ? 'Ativo' : 'Suspenso'}</Etiqueta> },
          ]}
        />
      )}
    </>
  );
}
