import { Link, Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

/** Layout das telas de entrada (login, cadastro, recuperar senha). */
export default function AuthLayout() {
  return (
    <div className={styles.tela}>
      <section className={styles.arte} aria-hidden="true">
        <div className={styles.discoGrande} />
        <blockquote className={styles.frase}>
          Cada disco tem uma ficha.
          <br />
          Cada ficha, uma história.
        </blockquote>
      </section>

      <section className={styles.lado}>
        <Link to="/" className={styles.marca}>
          Radiola <em>de Ficha</em>
        </Link>
        <div className={styles.cartao}>
          <Outlet />
        </div>
      </section>
    </div>
  );
}
