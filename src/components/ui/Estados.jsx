import styles from './Estados.module.css';

/*
 * Os três estados que toda tela com dados tem: carregando, vazio e erro.
 * Tratar os três sempre é o que separa um sistema "funciona na demo"
 * de um sistema profissional (RNF018 – feedback visual).
 */

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className={styles.estado} role="status">
      <span className={styles.disco} aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function EstadoVazio({ titulo, mensagem, acao }) {
  return (
    <div className={styles.estado}>
      <span className={`${styles.disco} ${styles.parado}`} aria-hidden="true" />
      <strong className={styles.titulo}>{titulo}</strong>
      {mensagem && <p className={styles.mensagem}>{mensagem}</p>}
      {acao}
    </div>
  );
}

export function EstadoErro({ erro, aoTentarDeNovo }) {
  return (
    <div className={styles.estado} role="alert">
      <strong className={styles.titulo}>Algo deu errado</strong>
      <p className={styles.mensagem}>{erro?.message || 'Tente novamente em instantes.'}</p>
      {aoTentarDeNovo && (
        <button type="button" className={styles.link} onClick={aoTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
