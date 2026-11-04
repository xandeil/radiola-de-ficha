import { Link } from 'react-router-dom';
import styles from './Botao.module.css';

/*
 * Um único botão para o sistema inteiro.
 * - variante: 'primario' | 'secundario' | 'fantasma' | 'perigo'
 * - para="/rota" transforma em <Link> mantendo o mesmo visual
 * - carregando desabilita e mostra feedback (RNF018)
 */
export default function Botao({
  children,
  variante = 'primario',
  tamanho = 'medio',
  para,
  carregando = false,
  icone,
  className = '',
  type = 'button',
  disabled = false,
  ...resto
}) {
  const classes = [styles.botao, styles[variante], styles[tamanho], className].join(' ');
  const conteudo = (
    <>
      {carregando ? <span className={styles.spinner} aria-hidden="true" /> : icone}
      {children && <span>{children}</span>}
    </>
  );

  if (para) {
    return (
      <Link to={para} className={classes} {...resto}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={carregando || disabled} aria-busy={carregando} {...resto}>
      {conteudo}
    </button>
  );
}
