import { t } from '@/i18n';
import styles from './Tabela.module.css';

/*
 * Tabela reutilizável, configurada por COLUNAS (padrão muito usado em painéis).
 *
 *   <Tabela
 *     dados={usuarios}
 *     chave="id"
 *     colunas={[
 *       { titulo: 'Nome', campo: 'nome' },
 *       { titulo: 'Plano', render: (u) => <Etiqueta>{u.plano}</Etiqueta> },
 *       { titulo: 'Itens', campo: 'itens', alinhar: 'direita' },
 *     ]}
 *   />
 *
 * Cada coluna usa "campo" (valor direto) ou "render" (JSX livre). A tabela
 * não sabe nada de usuários, tickets ou backups — por isso serve para todos.
 * No celular, cada linha vira um "cartão" com rótulo: valor (data-rotulo + CSS).
 */
export default function Tabela({ dados, colunas, chave = 'id', vazio, aoClicarLinha, legenda }) {
  if (!dados?.length) return <p className={styles.vazio}>{vazio ?? t('comum.nadaPorAqui')}</p>;

  return (
    <div className={styles.container}>
      <table className={styles.tabela}>
        {legenda && <caption className="sr-only">{legenda}</caption>}
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.titulo} scope="col" className={c.alinhar === 'direita' ? styles.direita : ''}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((linha) => (
            <tr
              key={linha[chave]}
              className={aoClicarLinha ? styles.clicavel : ''}
              onClick={aoClicarLinha ? () => aoClicarLinha(linha) : undefined}
              // Linha clicável também precisa funcionar pelo teclado
              tabIndex={aoClicarLinha ? 0 : undefined}
              onKeyDown={aoClicarLinha ? (e) => e.key === 'Enter' && aoClicarLinha(linha) : undefined}
            >
              {colunas.map((c) => (
                <td key={c.titulo} data-rotulo={c.titulo} className={c.alinhar === 'direita' ? styles.direita : ''}>
                  {c.render ? c.render(linha) : linha[c.campo] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pílula colorida para status. tom: 'neutro' | 'sucesso' | 'aviso' | 'erro' | 'info' */
export function Etiqueta({ tom = 'neutro', children }) {
  return <span className={`${styles.etiqueta} ${styles[tom]}`}>{children}</span>;
}
