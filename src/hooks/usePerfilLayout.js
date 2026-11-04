import { useEffect, useState } from 'react';
import { PERFIS_LAYOUT } from '@/utils/constantes';
import { usePlano } from '@/contexts/PlanoContext';

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
  const { plano } = usePlano();
  // RF046: o plano gratuito só tem a Vitrola Clássica
  const liberados = plano.recursos?.perfis > 1;
  const bloqueado = (valor) => !liberados && PERFIS_LAYOUT.find((p) => p.valor === valor)?.premium;

  useEffect(() => {
    const aoMudar = () => setPerfilEstado(ler());
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  const setPerfil = (novo) => {
    if (!disponiveis.includes(novo) || bloqueado(novo)) return false;
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      /* ignora */
    }
    window.dispatchEvent(new Event(EVENTO));
    return true;
  };

  // Se a assinatura acabou, o perfil salvo continua guardado, mas o efetivo volta a ser a Vitrola
  return { perfil: bloqueado(perfil) ? 'vitrola' : perfil, setPerfil, bloqueado };
}
