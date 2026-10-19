import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Carregando } from '@/components/ui/Estados';
import { useAuth } from '@/contexts/AuthContext';
import { temPermissao } from '@/utils/permissoes';
import Icone from '@/components/ui/Icone';
import { AvisoManutencao } from '@/components/manutencao/PortaoManutencao';
import styles from './AdminLayout.module.css';

/*
 * Layout do painel administrativo (seção 10). O menu só mostra o que o
 * papel da pessoa pode acessar: a Bia do suporte vê Tickets, o Caio do
 * financeiro vê Financeiro. Mas lembre: esconder o link não protege a
 * página — cada página (e cada endpoint) confere a permissão de novo.
 */

const ITENS = [
  { para: '/admin', rotulo: 'Visão geral', icone: 'inicio', permissao: 'dashboard.ver', end: true },
  { para: '/admin/usuarios', rotulo: 'Usuários', icone: 'pessoas', permissao: 'usuarios.ver' },
  { para: '/admin/tickets', rotulo: 'Tickets', icone: 'grupo', permissao: 'tickets.ver' },
  { para: '/admin/crm', rotulo: 'CRM e automações', icone: 'estrela', permissao: 'crm.ver' },
  { para: '/admin/financeiro', rotulo: 'Financeiro', icone: 'arquivo', permissao: 'assinaturas.ver' },
  { para: '/admin/backup', rotulo: 'Backup', icone: 'download', permissao: 'backup.ver' },
  { para: '/admin/manutencao', rotulo: 'Manutenção', icone: 'engrenagem', permissao: '*' },
  { para: '/admin/logs', rotulo: 'Auditoria', icone: 'livro', permissao: 'logs.ver' },
];

export default function AdminLayout() {
  const { usuario } = useAuth();
  const pode = (p) => (p === '*' ? usuario?.permissoes?.includes('*') : temPermissao(usuario, p));

  return (
    <div className={styles.admin}>
      <aside className={styles.lateral}>
        <div className={styles.marca}>
          <span className={styles.logo} aria-hidden="true" />
          <span>
            Radiola <em>Admin</em>
          </span>
        </div>
        <nav aria-label="Administração" className={styles.nav}>
          {ITENS.filter((i) => pode(i.permissao)).map((i) => (
            <NavLink key={i.para} to={i.para} end={i.end} className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}>
              <Icone nome={i.icone} />
              <span>{i.rotulo}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.rodape}>
          <span className={styles.quem}>
            <strong>{usuario?.nome}</strong>
            <small>{usuario?.papeis?.join(', ')}</small>
          </span>
          <Link to="/dashboard" className={styles.link}>
            <Icone nome="voltar" />
            <span>Voltar ao app</span>
          </Link>
        </div>
      </aside>
      <main className={styles.conteudo}>
        <AvisoManutencao />
        <Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/** Mostrado quando a pessoa entra numa página do admin sem a permissão daquela área. */
export function SemPermissao() {
  return (
    <div className={styles.semPermissao}>
      <h1>Acesso restrito</h1>
      <p>Seu papel não dá acesso a esta área. Fale com um administrador se precisar.</p>
      <Link to="/admin">Voltar à visão geral</Link>
    </div>
  );
}

/** Protege uma página do admin por permissão. */
export function ExigePermissao({ permissao, children }) {
  const { usuario } = useAuth();
  const ok = permissao === '*' ? usuario?.permissoes?.includes('*') : temPermissao(usuario, permissao);
  return ok ? children : <SemPermissao />;
}
