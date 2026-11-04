import { useCallback } from 'react';
import { conquistaService } from '@/services/conquistaService';
import { useToast } from '@/contexts/ToastContext';
import { t as traduzir } from '@/i18n';
import { descricaoConquista, nomeConquista } from '@/i18n/dominio';

/*
 * Devolve uma função verificar() para chamar depois de ações que podem
 * render conquista (cadastrar disco, escrever resenha, convidar amigo).
 * Se algo foi desbloqueado, mostra o toast dourado.
 *
 * Erros aqui são engolidos de propósito: conquista é um "bônus" e nunca
 * deve atrapalhar a ação principal que o usuário acabou de fazer.
 */
export function useConquistas() {
  const { mostrar } = useToast();

  const verificar = useCallback(async () => {
    try {
      const { novas } = await conquistaService.verificar();
      novas.forEach((c) => mostrar(traduzir('social.conq.toast', { descricao: descricaoConquista(c), pts: c.pontos }), { tipo: 'conquista', titulo: `🏅 ${nomeConquista(c)}` }));
      return novas;
    } catch {
      return [];
    }
  }, [mostrar]);

  return { verificar };
}
