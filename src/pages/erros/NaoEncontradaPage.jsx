import Botao from '@/components/ui/Botao';
import styles from './NaoEncontradaPage.module.css';

export default function NaoEncontradaPage() {
  return (
    <div className={styles.pagina}>
      <span className={styles.codigo}>404</span>
      <h1>Essa faixa não está no disco</h1>
      <p>A página que você procurou não existe ou mudou de lugar.</p>
      <Botao para="/dashboard">Voltar ao início</Botao>
    </div>
  );
}
