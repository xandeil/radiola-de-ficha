import { useCallback, useEffect, useState } from 'react';

/*
 * Hook reutilizável para buscar dados assíncronos.
 * Sem ele, toda página repetiria o mesmo trio de useState
 * (dados / carregando / erro) + useEffect. DRY: Don't Repeat Yourself.
 *
 * Uso:
 *   const { dados, carregando, erro, recarregar } =
 *     useCarregar(() => catalogoService.listar(filtros), [filtros]);
 */
export function useCarregar(funcaoBusca, dependencias = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const [versao, setVersao] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buscar = useCallback(funcaoBusca, dependencias);

  useEffect(() => {
    let cancelado = false; // evita setState depois que o componente saiu da tela
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    buscar()
      .then((dados) => !cancelado && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => !cancelado && setEstado({ dados: null, carregando: false, erro }));
    return () => {
      cancelado = true;
    };
  }, [buscar, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return { ...estado, recarregar };
}
