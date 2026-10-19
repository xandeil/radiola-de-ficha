import styles from './TituloPagina.module.css';

/** Cabeçalho padrão de toda página: título, subtítulo e ações à direita. */
export default function TituloPagina({ titulo, subtitulo, acoes, sobretitulo }) {
  return (
    <header className={styles.cabecalho}>
      <div>
        {sobretitulo && <span className={styles.sobretitulo}>{sobretitulo}</span>}
        <h1 className={styles.titulo}>{titulo}</h1>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
      </div>
      {acoes && <div className={styles.acoes}>{acoes}</div>}
    </header>
  );
}
