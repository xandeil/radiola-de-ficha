import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlano } from '@/contexts/PlanoContext';
import styles from './AvisosAssinatura.module.css';

/*
 * RF056 – Notificações de assinatura no topo do app: fim do teste,
 * pagamento pendente ou recusado, assinatura cancelada.
 * Fechar esconde só nesta sessão (sessionStorage): o aviso volta amanhã,
 * porque o problema continua existindo.
 */

const DESTINO = {
  'Assinar agora': '/planos',
  Reativar: '/assinatura',
  Renovar: '/planos',
  'Tentar de novo': '/planos',
};

const CHAVE = 'radiola.avisosFechados';
const lerFechados = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE)) || [];
  } catch {
    return [];
  }
};

export default function AvisosAssinatura() {
  const { avisos } = usePlano();
  const [fechados, setFechados] = useState(lerFechados);

  const visiveis = avisos.filter((a) => !fechados.includes(a.texto));
  if (!visiveis.length) return null;

  const fechar = (texto) => {
    const novos = [...fechados, texto];
    setFechados(novos);
    sessionStorage.setItem(CHAVE, JSON.stringify(novos));
  };

  return (
    <div className={styles.pilha}>
      {visiveis.map((a) => (
        <div key={a.texto} className={`${styles.item} ${styles[a.tipo]}`} role="status">
          <span>{a.texto}</span>
          {a.acao && (
            <Link to={a.id_transacao ? `/assinatura/pagamento/${a.id_transacao}` : DESTINO[a.acao] || '/assinatura'}>{a.acao}</Link>
          )}
          <button type="button" onClick={() => fechar(a.texto)} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
