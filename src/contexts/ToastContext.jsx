import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useT } from './I18nContext';
import styles from './Toast.module.css';

/*
 * Avisos rápidos no canto da tela ("Conquista desbloqueada!", "Solicitação enviada").
 * Qualquer componente chama mostrar('texto') sem precisar montar nada.
 * Somem sozinhos depois de alguns segundos.
 */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const t = useT();

  const fechar = useCallback((id) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const mostrar = useCallback(
    (texto, { tipo = 'info', titulo, duracao = 4500 } = {}) => {
      const id = Date.now() + Math.random();
      setAvisos((a) => [...a.slice(-2), { id, texto, tipo, titulo }]); // no máximo 3 na tela
      setTimeout(() => fechar(id), duracao);
    },
    [fechar],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className={styles.pilha} aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`${styles.toast} ${styles[a.tipo] || ''}`} role="status">
            <div>
              {a.titulo && <strong>{a.titulo}</strong>}
              <span>{a.texto}</span>
            </div>
            <button type="button" onClick={() => fechar(a.id)} aria-label={t('comum.fechar')}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}
