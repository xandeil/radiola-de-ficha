import { useState } from 'react';
import { usePlano } from '@/contexts/PlanoContext';
import { useToast } from '@/contexts/ToastContext';
import { assinaturaService } from '@/services/assinaturaService';
import Botao from '@/components/ui/Botao';
import Modal from '@/components/ui/Modal';
import styles from './RecursoPremium.module.css';

/*
 * Peças de "upsell": convidam o usuário gratuito a experimentar o Premium
 * sem esconder que o recurso existe (esconder frustra; mostrar e explicar vende).
 */

/** Botões "Testar 7 dias grátis" (se ainda puder) e "Ver planos". */
export function AcoesUpsell({ aoAtivar }) {
  const { trialDisponivel, recarregar } = usePlano();
  const { mostrar } = useToast();
  const [ativando, setAtivando] = useState(false);

  const testar = async () => {
    setAtivando(true);
    try {
      await assinaturaService.iniciarTrial();
      await recarregar();
      mostrar('Pronto! Você tem 7 dias de Radiola Completa.', { tipo: 'conquista', titulo: '✨ Teste grátis ativado' });
      aoAtivar?.();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setAtivando(false);
    }
  };

  return (
    <div className={styles.acoes}>
      {trialDisponivel && (
        <Botao carregando={ativando} onClick={testar}>
          Testar 7 dias grátis
        </Botao>
      )}
      <Botao variante={trialDisponivel ? 'secundario' : 'primario'} para="/planos">
        Ver planos
      </Botao>
    </div>
  );
}

/** Envolve uma tela/recurso inteiro: mostra o conteúdo ou o convite. */
export default function RecursoPremium({ recurso, titulo, descricao, children }) {
  const { pode, carregado } = usePlano();
  if (!carregado) return null;
  if (pode(recurso)) return children;

  return (
    <section className={styles.bloqueio}>
      <span className={styles.selo} aria-hidden="true">★</span>
      <h1>{titulo}</h1>
      <p>{descricao}</p>
      <AcoesUpsell />
      <small>Sem fidelidade: cancele quando quiser.</small>
    </section>
  );
}

/** Modal para recursos menores (ex.: trocar o perfil do player). */
export function ModalUpsell({ aberto, titulo, descricao, aoFechar }) {
  return (
    <Modal aberto={aberto} titulo={titulo} aoFechar={aoFechar}>
      <p>{descricao}</p>
      <div className={styles.modalAcoes}>
        <AcoesUpsell aoAtivar={aoFechar} />
      </div>
    </Modal>
  );
}
