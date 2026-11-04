import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlano } from '@/contexts/PlanoContext';
import styles from './AvisosAssinatura.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF056 – Notificações de assinatura no topo do app: fim do teste,
 * pagamento pendente ou recusado, assinatura cancelada.
 * Fechar esconde só nesta sessão (sessionStorage): o aviso volta amanhã,
 * porque o problema continua existindo.
 */

// O servidor manda CÓDIGOS (não frases): cada idioma monta o próprio texto.
const DESTINO = {
  assinar: '/planos',
  reativar: '/assinatura',
  renovar: '/planos',
  tentarDeNovo: '/planos',
};
const chaveDoAviso = (a) => `${a.codigo}:${JSON.stringify(a.vars || {})}`;

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
  const t = useT();
  const [fechados, setFechados] = useState(lerFechados);

  const visiveis = avisos.filter((a) => !fechados.includes(chaveDoAviso(a)));
  if (!visiveis.length) return null;

  const fechar = (chave) => {
    const novos = [...fechados, chave];
    setFechados(novos);
    sessionStorage.setItem(CHAVE, JSON.stringify(novos));
  };

  return (
    <div className={styles.pilha}>
      {visiveis.map((a) => (
        <div key={chaveDoAviso(a)} className={`${styles.item} ${styles[a.tipo]}`} role="status">
          <span>{t(`assinatura.aviso.${a.codigo}`, a.vars)}</span>
          {a.acao && (
            <Link to={a.id_transacao ? `/assinatura/pagamento/${a.id_transacao}` : DESTINO[a.acao] || '/assinatura'}>{t(`assinatura.acao.${a.acao}`)}</Link>
          )}
          <button type="button" onClick={() => fechar(chaveDoAviso(a))} aria-label={t('layout.fecharAviso')}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
