import styles from './Alerta.module.css';

/** tipo: 'info' | 'sucesso' | 'erro' | 'aviso' */
export default function Alerta({ tipo = 'info', titulo, children, aoFechar }) {
  return (
    <div className={`${styles.alerta} ${styles[tipo]}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <div className={styles.corpo}>
        {titulo && <strong>{titulo}</strong>}
        {children && <div>{children}</div>}
      </div>
      {aoFechar && (
        <button type="button" className={styles.fechar} onClick={aoFechar} aria-label="Fechar aviso">
          ×
        </button>
      )}
    </div>
  );
}
