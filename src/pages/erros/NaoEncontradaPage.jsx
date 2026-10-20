import Botao from '@/components/ui/Botao';
import { useT } from '@/contexts/I18nContext';
import styles from './NaoEncontradaPage.module.css';

export default function NaoEncontradaPage() {
  const t = useT();
  return (
    <div className={styles.pagina}>
      <span className={styles.codigo}>404</span>
      <h1>{t('layout.naoEncontrada.titulo')}</h1>
      <p>{t('layout.naoEncontrada.texto')}</p>
      <Botao para="/dashboard">{t('layout.naoEncontrada.voltar')}</Botao>
    </div>
  );
}
