import { useState } from 'react';
import styles from './CapaMidia.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Capa do item. Se houver imagem (capa_imagem), mostra a imagem.
 * Se não houver — ou se a imagem falhar ao carregar (link quebrado, capa
 * que não existe no Cover Art Archive) — desenha uma capa genérica com a cor
 * do item e o formato desenhado (vinil, CD, fita).
 */
export default function CapaMidia({ item, tamanho = 'medio' }) {
  const t = useT();
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const cor = item.cor_capa || '#6e6055';

  if (item.capa_imagem && !imagemFalhou) {
    return (
      <img
        src={item.capa_imagem}
        alt={t('catalogo.capaDe', { titulo: item.titulo })}
        className={`${styles.capa} ${styles[tamanho]}`}
        loading="lazy"
        onError={() => setImagemFalhou(true)}
      />
    );
  }

  return (
    <div
      className={`${styles.capa} ${styles[tamanho]} ${styles.gerada}`}
      style={{ '--cor': cor }}
      role="img"
      aria-label={t('catalogo.capaIlustrativa', { titulo: item.titulo })}
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
