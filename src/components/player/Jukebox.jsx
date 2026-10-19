import { usePlayer } from '@/contexts/PlayerContext';
import styles from './Jukebox.module.css';

/*
 * RF036 – Perfil "Jukebox": a máquina de discos que deu nome ao projeto.
 *
 * - Os tubos de neon "correm" as cores enquanto toca (animação do
 *   background-position de um gradiente — barato para o navegador).
 * - Na janela de vidro, um disquinho gira no prato.
 * - Abaixo, as "fichas de seleção" com as faixas da fila, numeradas
 *   A1, A2, B1... como nas jukeboxes de verdade. Tocar numa ficha toca a faixa.
 */

const POR_PAGINA = 8;

const codigoSelecao = (i) => `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`;

export default function Jukebox() {
  const { atual, fila, indice, tocando, irPara, alternar } = usePlayer();

  // Mostra a "página" de fichas onde está a faixa atual
  const pagina = Math.max(0, Math.floor(Math.max(indice, 0) / POR_PAGINA));
  const fichas = fila.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  return (
    <div className={`${styles.jukebox} ${tocando ? styles.tocando : ''}`}>
      <div className={styles.arco}>
        <span className={styles.neon} aria-hidden="true" />
        <div className={styles.janela}>
          <span className={styles.letreiro}>Radiola</span>
          <button
            type="button"
            className={styles.prato}
            onClick={alternar}
            disabled={!atual}
            aria-label={tocando ? 'Pausar' : 'Tocar'}
          >
            <span className={styles.disco} style={{ '--cor-rotulo': atual?.item.cor_capa || '#d9a441' }} />
          </button>
        </div>
      </div>

      <div className={styles.painel}>
        {fichas.length === 0 ? (
          <p className={styles.vazio}>Insira uma ficha: escolha um disco na estante</p>
        ) : (
          <ol className={styles.fichas}>
            {fichas.map((faixa, i) => {
              const posicao = pagina * POR_PAGINA + i;
              const ativa = posicao === indice;
              return (
                <li key={`${faixa.chave}-${posicao}`}>
                  <button type="button" className={`${styles.ficha} ${ativa ? styles.fichaAtiva : ''}`} onClick={() => irPara(posicao)} aria-current={ativa ? 'true' : undefined}>
                    <span className={styles.codigo}>{codigoSelecao(posicao)}</span>
                    <span className={styles.textoFicha}>
                      <strong>{faixa.titulo}</strong>
                      <small>{faixa.item.artista}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className={styles.base} aria-hidden="true">
        <span className={styles.grade} />
        <span className={styles.moedeiro}>25¢</span>
      </div>
    </div>
  );
}
