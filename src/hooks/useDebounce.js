import { useEffect, useState } from 'react';

/*
 * Atrasa a atualização de um valor até o usuário parar de digitar.
 * Sem isso, cada letra digitada na busca dispararia uma requisição ao servidor.
 */
export function useDebounce(valor, atrasoMs = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);
  return atrasado;
}
