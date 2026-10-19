import { useEffect, useState } from 'react';
import { PERFIS_LAYOUT } from '@/utils/constantes';

/*
 * RF035 – Perfil visual do player escolhido pelo usuário.
 *
 * Vários componentes leem o perfil (configurações e página da vitrola).
 * Para todos ficarem sincronizados sem precisar de um Context novo,
 * disparamos um evento quando o valor muda e cada hook escuta esse evento.
 * (No back-end real isso vira a tabela perfil_layout.)
 */

const CHAVE = 'radiola.perfilLayout';
const EVENTO = 'radiola:perfil-layout';

const disponiveis = PERFIS_LAYOUT.filter((p) => p.disponivel).map((p) => p.valor);

function ler() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return disponiveis.includes(salvo) ? salvo : 'vitrola';
  } catch {
    return 'vitrola';
  }
}

export function usePerfilLayout() {
  const [perfil, setPerfilEstado] = useState(ler);

  useEffect(() => {
    const aoMudar = () => setPerfilEstado(ler());
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  const setPerfil = (novo) => {
    if (!disponiveis.includes(novo)) return;
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      /* ignora */
    }
    window.dispatchEvent(new Event(EVENTO));
  };

  return { perfil, setPerfil };
}
