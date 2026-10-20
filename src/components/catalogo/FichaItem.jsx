import { Link } from 'react-router-dom';
import CapaMidia from './CapaMidia';
import Icone from '@/components/ui/Icone';
import { anoDoItem } from '@/utils/formatadores';
import styles from './FichaItem.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF013 – Ficha visual: capa + informações principais + localização.
 * É o "cartão" que aparece na grade do catálogo. Componente pequeno,
 * só de apresentação: recebe o item por props e não busca nada sozinho.
 */
export default function FichaItem({ item, aoTocar }) {
  const t = useT();
  const local = item.localizacao;

  return (
    <article className={styles.ficha}>
      <Link to={`/catalogo/${item.id}`} className={styles.link}>
        <CapaMidia item={item} />
        <div className={styles.info}>
          <h3 className={styles.titulo}>{item.titulo}</h3>
          <p className={styles.artista}>
            {item.artista || t('catalogo.artistaDesconhecido')}
            {anoDoItem(item) && <span> · {anoDoItem(item)}</span>}
          </p>
          {local?.local_principal && (
            <p className={styles.local}>
              <Icone nome="local" tamanho={13} />
              <span>{[local.local_principal, local.movel, local.prateleira].filter(Boolean).join(' › ')}</span>
            </p>
          )}
        </div>
      </Link>

      {item.faixas?.length > 0 && aoTocar && (
        <button type="button" className={styles.tocar} onClick={() => aoTocar(item)} aria-label={t('catalogo.tocarItem', { titulo: item.titulo })}>
          <Icone nome="play" tamanho={16} />
        </button>
      )}
    </article>
  );
}
