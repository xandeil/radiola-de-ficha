import { useT } from '@/contexts/I18nContext';
import { aplicarAtualizacao, usePwa } from '@/pwa/pwa';
import styles from './AvisosPwa.module.css';

/*
 * Faixas do app instalado:
 *  - sem internet: avisa que o que já carregou continua disponível (RF093);
 *  - versão nova pronta: botão para atualizar. Não recarregamos sozinhos:
 *    a pessoa pode estar no meio de um cadastro e perderia o que digitou.
 */
export default function AvisosPwa() {
  const t = useT();
  const { online, atualizacaoPronta } = usePwa();

  return (
    <>
      {!online && (
        <div className={`${styles.faixa} ${styles.offline}`} role="status">
          <span aria-hidden="true">📡</span> {t('pwa.offline')}
        </div>
      )}
      {atualizacaoPronta && (
        <div className={styles.faixa} role="status">
          <span>{t('pwa.atualizacao')}</span>
          <button type="button" onClick={aplicarAtualizacao}>
            {t('pwa.atualizar')}
          </button>
        </div>
      )}
    </>
  );
}
