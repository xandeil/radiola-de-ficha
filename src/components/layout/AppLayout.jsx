import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTema } from '@/hooks/useTema';
import { useConquistas } from '@/hooks/useConquistas';
import Icone from '@/components/ui/Icone';
import MiniPlayer from '@/components/player/MiniPlayer';
import { usePlano } from '@/contexts/PlanoContext';
import AvisosAssinatura from '@/components/assinatura/AvisosAssinatura';
import IntervaloPublicitario from '@/components/publicidade/IntervaloPublicitario';
import { BannerTopo } from '@/components/publicidade/Anuncio';
import { AvisoManutencao } from '@/components/manutencao/PortaoManutencao';
import AvisosPwa from '@/components/pwa/AvisosPwa';
import { ehEquipe } from '@/utils/permissoes';
import { useT } from '@/contexts/I18nContext';
import SeletorIdioma from './SeletorIdioma';
import styles from './AppLayout.module.css';

/*
 * Layout das telas logadas. O <Outlet /> é onde o React Router
 * "encaixa" a página da rota atual — o menu e o player ficam fixos,
 * só o miolo troca.
 */

const MENU = [
  { para: '/dashboard', rotulo: 'inicio', icone: 'inicio' },
  { para: '/catalogo', rotulo: 'catalogo', icone: 'disco' },
  { para: '/catalogo/novo', rotulo: 'adicionar', icone: 'mais' },
  { para: '/scanner', rotulo: 'escanear', icone: 'codigo' },
  { para: '/busca', rotulo: 'buscar', icone: 'busca' },
  { para: '/player', rotulo: 'vitrola', icone: 'vitrola' },
];

const MENU_SOCIAL = [
  { para: '/feed', rotulo: 'feed', icone: 'pessoas' },
  { para: '/amigos', rotulo: 'amigos', icone: 'amigo' },
  { para: '/grupos', rotulo: 'grupos', icone: 'grupo' },
  { para: '/conquistas', rotulo: 'conquistas', icone: 'medalha' },
];

// No celular cabem 5 botões: "Adicionar" sai (está no catálogo) e entra "Conta"
const MENU_CELULAR = [
  ...MENU.filter((m) => !['/catalogo/novo', '/busca', '/scanner'].includes(m.para)),
  { para: '/feed', rotulo: 'social', icone: 'pessoas' },
  { para: '/configuracoes', rotulo: 'conta', icone: 'engrenagem' },
];


export default function AppLayout() {
  const { usuario, logout } = useAuth();
  const t = useT();
  const { atual } = usePlayer();
  const { tema, proximoTema } = useTema();
  const rotuloTema = t(`layout.tema.${tema}`);
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const miniPlayerVisivel = atual && pathname !== '/player';
  const { verificar } = useConquistas();
  const { premium, plano } = usePlano();
  // Sem banner nas telas de pagamento (atrapalharia a conversão) e no player (já tem a vinheta)
  const semBanner = pathname.startsWith('/assinatura') || pathname === '/planos' || pathname === '/player';

  // Ao entrar no app, confere se alguma conquista foi atingida (ex.: itens cadastrados em outro aparelho)
  useEffect(() => {
    verificar();
  }, [verificar]);

  const sair = () => {
    logout();
    navegar('/login', { replace: true });
  };

  return (
    <div className={`${styles.app} ${miniPlayerVisivel ? styles.comPlayer : ''}`}>
      <a href="#conteudo" className={styles.pular}>
        {t('comum.pularConteudo')}
      </a>

      <aside className={styles.lateral}>
        <NavLink to="/dashboard" className={styles.marca}>
          <span className={styles.logo} aria-hidden="true" />
          <span>
            Radiola <em>de Ficha</em>
          </span>
        </NavLink>

        <nav aria-label={t('layout.navPrincipal')} className={styles.nav}>
          {MENU.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === '/catalogo'} // sem "end", /catalogo ficaria ativo também em /catalogo/novo
              className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}
            >
              <Icone nome={item.icone} />
              <span>{t(`layout.menu.${item.rotulo}`)}</span>
            </NavLink>
          ))}
          <span className={styles.secaoMenu}>{t('layout.menu.social')}</span>
          {MENU_SOCIAL.map((item) => (
            <NavLink key={item.para} to={item.para} className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}>
              <Icone nome={item.icone} />
              <span>{t(`layout.menu.${item.rotulo}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.rodapeLateral}>
          <div className={styles.idioma}>
            <SeletorIdioma />
          </div>
          <button type="button" className={styles.link} onClick={proximoTema} title={rotuloTema}>
            <Icone nome="tema" />
            <span>{rotuloTema}</span>
          </button>
          <NavLink
            to={premium ? '/assinatura' : '/planos'}
            className={({ isActive }) => `${styles.link} ${premium ? '' : styles.sejaPremium} ${isActive ? styles.ativo : ''}`}
          >
            <Icone nome="estrela" />
            <span>{premium ? plano.nome : t('layout.menu.sejaPremium')}</span>
          </NavLink>
          {ehEquipe(usuario) && (
            <NavLink to="/admin" className={styles.link}>
              <Icone nome="grupo" />
              <span>{t('layout.menu.admin')}</span>
            </NavLink>
          )}
          <NavLink to="/suporte" className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}>
            <Icone nome="livro" />
            <span>{t('layout.menu.ajuda')}</span>
          </NavLink>
          <NavLink to="/configuracoes" className={({ isActive }) => `${styles.link} ${isActive ? styles.ativo : ''}`}>
            <Icone nome="engrenagem" />
            <span>{t('layout.menu.configuracoes')}</span>
          </NavLink>
          <div className={styles.usuario}>
            <span className={styles.avatar} aria-hidden="true">
              {usuario?.nome?.[0]?.toUpperCase()}
            </span>
            <Link to={`/perfil/${usuario?.apelido}`} className={styles.nomeUsuario} title={t('layout.verPerfil')}>
              <strong>{usuario?.nome}</strong>
              <small>@{usuario?.apelido}</small>
            </Link>
            <button type="button" className={styles.sair} onClick={sair} aria-label={t('layout.sair')} title={t('layout.sairCurto')}>
              <Icone nome="sair" />
            </button>
          </div>
        </div>
      </aside>

      <main id="conteudo" className={styles.conteudo}>
        <AvisosPwa />
        <AvisoManutencao />
        <AvisosAssinatura />
        {!semBanner && <BannerTopo key={pathname} pagina={pathname} />}
        <Outlet />
      </main>

      <IntervaloPublicitario />

      <MiniPlayer />

      {/* Navegação inferior no celular (RNF014) */}
      <nav aria-label={t('layout.navCelular')} className={styles.navInferior}>
        {MENU_CELULAR.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.para === '/catalogo'}
            className={({ isActive }) => `${styles.linkInferior} ${isActive ? styles.ativo : ''}`}
          >
            <Icone nome={item.icone} tamanho={20} />
            <span>{t(`layout.menu.${item.rotulo}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
