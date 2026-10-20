import { useEffect, useRef } from 'react';
import Botao from './Botao';
import { useT } from '@/contexts/I18nContext';
import styles from './Modal.module.css';

/*
 * Modal baseado no <dialog> nativo do HTML.
 * Por que nativo? Ele já resolve sozinho foco preso dentro do modal,
 * tecla Esc para fechar e o fundo escurecido (::backdrop). Menos código, menos bug.
 */
export default function Modal({ aberto, titulo, children, aoFechar, acoes }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog ref={ref} className={styles.modal} onClose={aoFechar} aria-labelledby="modal-titulo">
      <h2 id="modal-titulo" className={styles.titulo}>
        {titulo}
      </h2>
      <div className={styles.corpo}>{children}</div>
      {acoes && <div className={styles.acoes}>{acoes}</div>}
    </dialog>
  );
}

/** Atalho para o caso mais comum: "tem certeza?" */
export function ModalConfirmacao({ aberto, titulo, mensagem, textoConfirmar, perigo, carregando, aoConfirmar, aoFechar }) {
  const t = useT();
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoFechar}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            {t('comum.cancelar')}
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} carregando={carregando} onClick={aoConfirmar}>
            {textoConfirmar || t('comum.confirmar')}
          </Botao>
        </>
      }
    >
      <p>{mensagem}</p>
    </Modal>
  );
}
