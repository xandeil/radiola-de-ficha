import { NavLink } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { socialService } from '@/services/socialService';
import styles from './NavSocial.module.css';

/** Abas no topo das páginas sociais, com contador de solicitações pendentes. */
export default function NavSocial() {
  const { dados: pendentes } = useCarregar(() => socialService.contarPendentes(), []);

  const abas = [
    { para: '/feed', rotulo: 'Feed' },
    { para: '/amigos', rotulo: 'Amigos', contador: pendentes },
    { para: '/grupos', rotulo: 'Grupos' },
    { para: '/conquistas', rotulo: 'Conquistas' },
  ];

  return (
    <nav className={styles.nav} aria-label="Social">
      {abas.map((a) => (
        <NavLink key={a.para} to={a.para} className={({ isActive }) => `${styles.aba} ${isActive ? styles.ativa : ''}`}>
          {a.rotulo}
          {a.contador > 0 && (
            <span className={styles.contador} aria-label={`${a.contador} pendentes`}>
              {a.contador}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
