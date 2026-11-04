import { useState } from 'react';
import styles from './GraficoBarras.module.css';

/*
 * Gráfico de barras simples em HTML/CSS (sem biblioteca).
 * - Uma série só = uma cor só, sem legenda (o título já diz o que é).
 * - Barras finas com ponta arredondada, presas na linha de base.
 * - Hover/foco mostra o valor exato (tooltip) — e cada barra é focável pelo teclado.
 * - "Ver como tabela": o mesmo dado em texto, para leitores de tela e para quem
 *   precisa do número exato (gráfico nunca deve ser a ÚNICA forma de ler o dado).
 * horizontal=true serve para rótulos longos (nomes de planos).
 */
export default function GraficoBarras({ titulo, dados, rotulo = (d) => d.rotulo, valor = (d) => d.valor, formatar = (v) => v, horizontal = false, altura = 160 }) {
  const [tabela, setTabela] = useState(false);
  const [ativo, setAtivo] = useState(null);
  const maximo = Math.max(1, ...dados.map(valor));
  const tudoZero = dados.every((d) => !valor(d));
  // Tooltip das pontas encosta na borda em vez de vazar para fora do cartão
  const lado = (i) => (i < dados.length * 0.25 ? styles.dicaEsquerda : i >= dados.length * 0.75 ? styles.dicaDireita : '');

  return (
    <figure className={styles.figura}>
      <figcaption className={styles.cabecalho}>
        <span>{titulo}</span>
        <button type="button" onClick={() => setTabela((t) => !t)}>{tabela ? 'Ver gráfico' : 'Ver como tabela'}</button>
      </figcaption>

      {tudoZero && !tabela ? (
        <p className={styles.vazio}>Nenhum registro no período.</p>
      ) : tabela ? (
        <table className={styles.tabela}>
          <tbody>
            {dados.map((d) => (
              <tr key={rotulo(d)}>
                <th scope="row">{rotulo(d)}</th>
                <td>{formatar(valor(d))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : horizontal ? (
        <div className={styles.horizontal}>
          {dados.map((d) => (
            <div key={rotulo(d)} className={styles.linhaH}>
              <span className={styles.rotuloH}>{rotulo(d)}</span>
              <span className={styles.trilhoH}>
                <span className={styles.barraH} style={{ width: `${(valor(d) / maximo) * 100}%` }} />
              </span>
              <span className={styles.valorH}>{formatar(valor(d))}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.vertical} style={{ height: altura }} role="img" aria-label={`${titulo}: ${dados.map((d) => `${rotulo(d)} ${formatar(valor(d))}`).join(', ')}`}>
          {dados.map((d, i) => (
            <div
              key={rotulo(d)}
              className={styles.coluna}
              tabIndex={0}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
            >
              {ativo === i && (
                <span className={`${styles.dica} ${lado(i)}`} role="tooltip">
                  <strong>{formatar(valor(d))}</strong> {rotulo(d)}
                </span>
              )}
              <span className={styles.barra} style={{ height: `${Math.max(valor(d) ? 3 : 0, (valor(d) / maximo) * 100)}%` }} />
            </div>
          ))}
        </div>
      )}
      {!tabela && !horizontal && !tudoZero && (
        <div className={styles.eixo} aria-hidden="true">
          <span>{rotulo(dados[0])}</span>
          <span>{rotulo(dados.at(-1))}</span>
        </div>
      )}
    </figure>
  );
}
