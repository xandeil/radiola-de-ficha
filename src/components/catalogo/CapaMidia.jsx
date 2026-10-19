import styles from './CapaMidia.module.css';

/*
 * Capa do item. Se houver imagem (capa_imagem), mostra a imagem.
 * Se não houver, desenha uma capa genérica com a cor do item e o
 * formato desenhado (vinil, CD, fita) — melhor que um "sem imagem" cinza.
 */
export default function CapaMidia({ item, tamanho = 'medio' }) {
  const cor = item.cor_capa || '#6e6055';

  if (item.capa_imagem) {
    return <img src={item.capa_imagem} alt={`Capa de ${item.titulo}`} className={`${styles.capa} ${styles[tamanho]}`} loading="lazy" />;
  }

  return (
    <div
      className={`${styles.capa} ${styles[tamanho]} ${styles.gerada}`}
      style={{ '--cor': cor }}
      role="img"
      aria-label={`Capa ilustrativa de ${item.titulo}`}
    >
      <span className={`${styles.forma} ${styles[`forma${item.tipo_midia}`] || ''}`} aria-hidden="true" />
      <span className={styles.selo}>{item.tipo_midia}</span>
      <span className={styles.texto}>
        <strong>{item.titulo}</strong>
        <small>{item.artista}</small>
      </span>
    </div>
  );
}
