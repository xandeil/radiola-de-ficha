import { useState } from 'react';
import { socialService } from '@/services/socialService';
import { useToast } from '@/contexts/ToastContext';
import Botao from '@/components/ui/Botao';

/*
 * O botão muda conforme a relação entre você e a pessoa (RF060).
 * Toda a "máquina de estados" da amizade fica aqui:
 *   nenhuma  -> [Adicionar]          -> enviada
 *   enviada  -> [Cancelar pedido]    -> nenhuma
 *   recebida -> [Aceitar] [Recusar]  -> amigos | nenhuma
 *   amigos   -> [Desfazer amizade]   -> nenhuma
 *   bloqueado (por mim) -> [Desbloquear] -> nenhuma
 * aoMudar() avisa o pai para recarregar os dados.
 */
export default function BotaoAmizade({ usuario, relacao, aoMudar, tamanho = 'medio' }) {
  const { mostrar } = useToast();
  const [carregando, setCarregando] = useState(false);

  const executar = async (acao, mensagem) => {
    setCarregando(true);
    try {
      await acao();
      if (mensagem) mostrar(mensagem);
      await aoMudar?.();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setCarregando(false);
    }
  };

  const { tipo, id_amizade } = relacao || { tipo: 'nenhuma' };

  if (tipo === 'eu') return null;
  if (tipo === 'nenhuma') {
    return (
      <Botao tamanho={tamanho} carregando={carregando} onClick={() => executar(() => socialService.solicitarAmizade(usuario.id), `Pedido enviado para ${usuario.nome}`)}>
        Adicionar amigo
      </Botao>
    );
  }
  if (tipo === 'enviada') {
    return (
      <Botao tamanho={tamanho} variante="secundario" carregando={carregando} onClick={() => executar(() => socialService.removerAmizade(id_amizade))}>
        Cancelar pedido
      </Botao>
    );
  }
  if (tipo === 'recebida') {
    return (
      <>
        <Botao tamanho={tamanho} carregando={carregando} onClick={() => executar(() => socialService.responderAmizade(id_amizade, 'aceitar'), `Agora você e ${usuario.nome} são amigos`)}>
          Aceitar
        </Botao>
        <Botao tamanho={tamanho} variante="secundario" disabled={carregando} onClick={() => executar(() => socialService.responderAmizade(id_amizade, 'recusar'))}>
          Recusar
        </Botao>
      </>
    );
  }
  if (tipo === 'amigos') {
    return (
      <Botao tamanho={tamanho} variante="secundario" carregando={carregando} onClick={() => executar(() => socialService.removerAmizade(id_amizade))}>
        Desfazer amizade
      </Botao>
    );
  }
  if (tipo === 'bloqueado') {
    return (
      <Botao tamanho={tamanho} variante="secundario" carregando={carregando} onClick={() => executar(() => socialService.removerAmizade(id_amizade), 'Desbloqueado')}>
        Desbloquear
      </Botao>
    );
  }
  return null;
}
