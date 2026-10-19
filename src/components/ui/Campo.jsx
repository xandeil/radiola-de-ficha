import { useId } from 'react';
import styles from './Campo.module.css';

/*
 * Campos de formulário com label, dica e erro já ligados por acessibilidade
 * (aria-invalid / aria-describedby). useId gera ids únicos automaticamente,
 * então você nunca precisa inventar id na mão.
 */

function Moldura({ id, rotulo, erro, dica, obrigatorio, className = '', children }) {
  return (
    <div className={`${styles.campo} ${className}`}>
      {rotulo && (
        <label htmlFor={id} className={styles.rotulo}>
          {rotulo}
          {obrigatorio && <span className={styles.asterisco} aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {erro ? (
        <span id={`${id}-erro`} className={styles.erro} role="alert">
          {erro}
        </span>
      ) : (
        dica && <span id={`${id}-dica`} className={styles.dica}>{dica}</span>
      )}
    </div>
  );
}

function ariaProps(id, erro, dica) {
  return {
    'aria-invalid': !!erro,
    'aria-describedby': erro ? `${id}-erro` : dica ? `${id}-dica` : undefined,
  };
}

export function Entrada({ rotulo, erro, dica, obrigatorio, className, ...props }) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      <input id={id} className={styles.controle} required={obrigatorio} {...ariaProps(id, erro, dica)} {...props} />
    </Moldura>
  );
}

/** opcoes: array de strings ou de { valor, rotulo } */
export function Selecao({ rotulo, erro, dica, obrigatorio, opcoes = [], vazio = 'Selecione...', className, ...props }) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      <select id={id} className={styles.controle} required={obrigatorio} {...ariaProps(id, erro, dica)} {...props}>
        {vazio !== null && <option value="">{vazio}</option>}
        {opcoes.map((o) => {
          const valor = typeof o === 'string' ? o : o.valor;
          const texto = typeof o === 'string' ? o : o.rotulo;
          return (
            <option key={valor} value={valor} disabled={typeof o === 'object' && o.disabled}>
              {texto}
            </option>
          );
        })}
      </select>
    </Moldura>
  );
}

export function AreaTexto({ rotulo, erro, dica, obrigatorio, className, ...props }) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={obrigatorio} className={className}>
      <textarea id={id} className={`${styles.controle} ${styles.area}`} rows={3} {...ariaProps(id, erro, dica)} {...props} />
    </Moldura>
  );
}

export function Caixa({ rotulo, className = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`${styles.caixa} ${className}`}>
      <input id={id} type="checkbox" {...props} />
      {rotulo}
    </label>
  );
}
