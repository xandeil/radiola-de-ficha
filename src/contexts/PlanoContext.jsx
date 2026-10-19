import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { assinaturaService } from '@/services/assinaturaService';
import { planosMock } from '@/mocks/assinatura';

/*
 * O plano do usuário logado, disponível para o app inteiro.
 *
 * Qualquer tela pergunta pode('scanner') em vez de comparar nomes de plano
 * (if plano === 'premium_mensal' || plano === 'premium_anual' || ...).
 * Assim, se amanhã o scanner virar recurso do plano gratuito, muda-se só o
 * JSON de recursos do plano — nenhuma tela precisa ser alterada.
 *
 * ⚠️ Lembre: esconder o botão no front é conforto. Quem garante que um
 * usuário gratuito não usa o scanner é o back-end recusando a requisição.
 */

const PlanoContext = createContext(null);

export function PlanoProvider({ children }) {
  const { usuario, recarregarUsuario } = useAuth();
  const [dados, setDados] = useState(null);

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setDados(null);
      return null;
    }
    const minha = await assinaturaService.minha();
    setDados(minha);
    return minha;
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recarregar().catch(() => setDados(null));
  }, [recarregar]);

  /** Depois de pagar/cancelar: atualiza o plano E o usuário (que guarda o código do plano). */
  const atualizarTudo = useCallback(async () => {
    const minha = await recarregar();
    await recarregarUsuario();
    return minha;
  }, [recarregar, recarregarUsuario]);

  const valor = useMemo(() => {
    const plano = dados?.plano || planosMock[0];
    return {
      carregado: Boolean(dados),
      plano,
      assinatura: dados?.assinatura || null,
      premium: Boolean(dados?.premium),
      emTrial: Boolean(dados?.emTrial),
      trialDisponivel: Boolean(dados?.trialDisponivel),
      transacoes: dados?.transacoes || [],
      membrosFamilia: dados?.membrosFamilia || [],
      avisos: dados?.avisos || [],
      comPropaganda: dados ? plano.propagandas : false, // enquanto carrega, não mostra anúncio
      pode: (recurso) => Boolean(plano.recursos?.[recurso]),
      recarregar: atualizarTudo,
    };
  }, [dados, atualizarTudo]);

  return <PlanoContext.Provider value={valor}>{children}</PlanoContext.Provider>;
}

export function usePlano() {
  const ctx = useContext(PlanoContext);
  if (!ctx) throw new Error('usePlano precisa estar dentro de <PlanoProvider>');
  return ctx;
}
