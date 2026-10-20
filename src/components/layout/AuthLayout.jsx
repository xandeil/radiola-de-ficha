import { Link, Outlet } from 'react-router-dom';
import { AvisoManutencao } from '@/components/manutencao/PortaoManutencao';
import { useT } from '@/contexts/I18nContext';
import SeletorIdioma from './SeletorIdioma';
import styles from './AuthLayout.module.css';

/** Layout das telas de entrada (login, cadastro, recuperar senha). */
export default function AuthLayout() {
  const t = useT();
  return (
    <div className={styles.tela}>
      <section className={styles.arte} aria-hidden="true">
        <div className={styles.discoGrande} />
        <blockquote className={styles.frase}>
          {t('auth.frase1')}
          <br />
          {t('auth.frase2')}
        </blockquote>
      </section>

      <section className={styles.lado}>
        <div className={styles.topo}>
          <Link to="/" className={styles.marca}>
            Radiola <em>de Ficha</em>
          </Link>
          <SeletorIdioma />
        </div>
        <div className={styles.cartao}>
          <AvisoManutencao />
          <Outlet />
        </div>
      </section>
    </div>
  );
}
