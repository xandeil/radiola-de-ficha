import styles from './Selo.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF081 – Selo virtual, desenhado como o rótulo central de um disco de vinil
 * (o "selo da gravadora"). Bloqueado = cinza e opaco.
 */
export default function Selo({ nome, cor = '#d9a441', bloqueado = false, tamanho = 72 }) {
  const t = useT();
  const inicial = nome
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={`${styles.selo} ${bloqueado ? styles.bloqueado : ''}`}
      style={{ '--cor': cor, width: tamanho, height: tamanho, fontSize: tamanho * 0.26 }}
      role="img"
      aria-label={`${nome}${bloqueado ? t('social.selo.bloqueada') : ''}`}
    >
      <span className={styles.rotulo}>{inicial}</span>
    </span>
  );
}
