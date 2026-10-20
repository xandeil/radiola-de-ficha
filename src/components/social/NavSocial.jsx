import { NavLink } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { socialService } from '@/services/socialService';
import styles from './NavSocial.module.css';
import { useT } from '@/contexts/I18nContext';

/** Abas no topo das páginas sociais, com contador de solicitações pendentes. */
export default function NavSocial() {
  const t = useT();
  const { dados: pendentes } = useCarregar(() => socialService.contarPendentes(), []);

  const abas = [
    { para: '/feed', rotulo: t('social.nav.feed') },
    { para: '/amigos', rotulo: t('social.nav.amigos'), contador: pendentes },
    { para: '/grupos', rotulo: t('social.nav.grupos') },
    { para: '/conquistas', rotulo: t('social.nav.conquistas') },
  ];

  return (
    <nav className={styles.nav} aria-label={t('social.nav.rotulo')}>
      {abas.map((a) => (
        <NavLink key={a.para} to={a.para} className={({ isActive }) => `${styles.aba} ${isActive ? styles.ativa : ''}`}>
          {a.rotulo}
          {a.contador > 0 && (
            <span className={styles.contador} aria-label={t('social.nav.pendentes', { n: a.contador })}>
              {a.contador}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
