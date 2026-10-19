import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { concluirLoginSpotify } from '@/services/streaming/spotifyAuth';
import { useStreaming } from '@/contexts/StreamingContext';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Botao from '@/components/ui/Botao';

/*
 * O Spotify devolve o usuário para cá depois do login (?code=...&state=...).
 * Trocamos o code pelo token e voltamos para as configurações.
 *
 * Por que o useRef "jaRodou"? No modo de desenvolvimento, o <StrictMode>
 * executa os efeitos DUAS vezes de propósito (para achar bugs). O code do
 * Spotify só pode ser usado uma vez: sem essa trava, a segunda tentativa falharia.
 */
export default function SpotifyCallbackPage() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { recarregar } = useStreaming();
  const [erro, setErro] = useState(null);
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;
    concluirLoginSpotify(params)
      .then(recarregar)
      .then(() => navegar('/configuracoes?conectado=spotify', { replace: true }))
      .catch(setErro);
  }, [params, navegar, recarregar]);

  if (erro) {
    return (
      <>
        <EstadoErro erro={erro} />
        <div style={{ textAlign: 'center' }}>
          <Botao variante="secundario" para="/configuracoes">Voltar para configurações</Botao>
        </div>
      </>
    );
  }
  return <Carregando texto="Conectando ao Spotify..." />;
}
