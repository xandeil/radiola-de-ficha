import { usePlayer } from '@/contexts/PlayerContext';
import Icone from '@/components/ui/Icone';
import { formatarDuracao } from '@/utils/formatadores';
import styles from './ListaFila.module.css';

/** RF026 – Fila de reprodução: tocar, reordenar e remover. */
export default function ListaFila() {
  const { fila, indice, irPara, removerDaFila, moverNaFila, tocando } = usePlayer();

  if (!fila.length) {
    return <p className={styles.vazia}>A fila está vazia. Escolha um disco no catálogo.</p>;
  }

  return (
    <ol className={styles.lista}>
      {fila.map((faixa, i) => {
        const atual = i === indice;
        return (
          <li key={`${faixa.chave}-${i}`} className={`${styles.linha} ${atual ? styles.atual : ''}`}>
            <button type="button" className={styles.principal} onClick={() => irPara(i)} aria-current={atual ? 'true' : undefined}>
              <span className={styles.numero}>
                {atual && tocando ? <span className={styles.equalizador} aria-label="Tocando agora"><i /><i /><i /></span> : `${faixa.lado || ''}${faixa.numero}`}
              </span>
              <span className={styles.texto}>
                <strong>{faixa.titulo}</strong>
                <small>{faixa.item.titulo}</small>
              </span>
              <span className={styles.duracao}>{formatarDuracao(faixa.duracao_segundos)}</span>
            </button>
            <div className={styles.acoes}>
              <button type="button" onClick={() => moverNaFila(i, i - 1)} disabled={i === 0} aria-label={`Subir ${faixa.titulo}`}>
                <Icone nome="cima" tamanho={16} />
              </button>
              <button type="button" onClick={() => moverNaFila(i, i + 1)} disabled={i === fila.length - 1} aria-label={`Descer ${faixa.titulo}`}>
                <Icone nome="baixo" tamanho={16} />
              </button>
              <button type="button" onClick={() => removerDaFila(i)} aria-label={`Remover ${faixa.titulo} da fila`}>
                <Icone nome="fechar" tamanho={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
