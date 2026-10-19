import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/hooks/useTema';
import Icone from '@/components/ui/Icone';
import MiniPlayer from '@/components/player/MiniPlayer';
import styles from './AppLayout.module.css';

/*
 * Layout das telas logadas. O <Outlet /> é onde o React Router
 * "encaixa" a página da rota atual — o menu e o player ficam fixos,
 * só o miolo troca.
 */

const MENU = [
  { para: '/dashboard', rotulo: 'Início', icone: 'inicio' },
  { para: '/catalogo', rotulo: 'Catálogo', icone: 'disco' },
  { para: '/catalogo/novo', rotulo: 'Adicionar', icone: 'mais' },
  { para: '/busca', rotulo: 'Buscar', icone: 'busca' },
  { para: '/player', rotulo: 'Vitrola', icone: 'vitrola' },
];

// No celular cabem 5 botões: "Adicionar" sai (está no catálogo) e entra "Conta"
const MENU_CELULAR = [
  ...MENU.filter((m) => m.para !== '/catalogo/novo'),
  { para: '/configuracoes', rotulo: 'Conta', icone: 'engrenagem' },
];

const ROTULO_TEMA = { auto: 'Tema: automático', light: 'Tema: claro', dark: 'Tema: escuro' };

export default function AppLayout() {
  const { usuario, logout } = useAuth();
  const { atual } = usePlayer();
  const { tema, proximoTema } = useTema();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const miniPlayerVisivel = atual && pathname !== '/player';

  const sair = () => {
    logout();
    navegar('/login', { replace: true });
  };

  return (
    <div className={`${styles.app} ${miniPlayerVisivel ? styles.comPlayer : ''}`}>
      <a href="#conteudo" className={styles.pular}>
        Pular para o conteúdo
      </a>

      <aside className={styles.lateral}>
        <NavLink to="/dashboard" className={styles.marca}>
          <span className={styles.logo} aria-hidden="true" />
          <span>
            Radiola <em>de Ficha</em>
          </span>
        </NavLink>

        <nav aria-label="Principal" className={styles.nav}>
          {MENU.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === '/catalogo'} // sem "end", /catalogo ficaria ativo também em /catalogo/novo
              className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}
            >
              <Icone nome={item.icone} />
              <span>{item.rotulo}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.rodapeLateral}>
          <button type="button" className={styles.link} onClick={proximoTema} title={ROTULO_TEMA[tema]}>
            <Icone nome="tema" />
            <span>{ROTULO_TEMA[tema]}</span>
          </button>
          <NavLink to="/configuracoes" className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}>
            <Icone nome="engrenagem" />
            <span>Configurações</span>
          </NavLink>
          <div className={styles.usuario}>
            <span className={styles.avatar} aria-hidden="true">
              {usuario?.nome?.[0]?.toUpperCase()}
            </span>
            <span className={styles.nomeUsuario}>
              <strong>{usuario?.nome}</strong>
              <small>Plano {usuario?.plano === 'gratuito' ? 'Radiola Básica' : 'Premium'}</small>
            </span>
            <button type="button" className={styles.sair} onClick={sair} aria-label="Sair da conta" title="Sair">
              <Icone nome="sair" />
            </button>
          </div>
        </div>
      </aside>

      <main id="conteudo" className={styles.conteudo}>
        <Outlet />
      </main>

      <MiniPlayer />

      {/* Navegação inferior no celular (RNF014) */}
      <nav aria-label="Principal (celular)" className={styles.navInferior}>
        {MENU_CELULAR.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.para === '/catalogo'}
            className={({ isActive }) => `${styles.linkInferior} ${isActive ? styles.ativo : ''}`}
          >
            <Icone nome={item.icone} tamanho={20} />
            <span>{item.rotulo}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
