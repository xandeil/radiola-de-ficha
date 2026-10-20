import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deezerService } from '@/services/streaming/deezerService';
import { useStreaming } from '@/contexts/StreamingContext';
import { useT } from '@/contexts/I18nContext';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Botao from '@/components/ui/Botao';

/*
 * Volta do login do Deezer. Diferente do Spotify (PKCE, ?code=),
 * o Deezer usa o fluxo "implícito": o token chega direto no #hash da URL.
 * O hash nunca é enviado ao servidor, por isso esse fluxo funciona sem back-end.
 * Logo depois de ler, limpamos o hash da barra de endereço (o token não fica à vista).
 */
export default function DeezerCallbackPage() {
  const navegar = useNavigate();
  const { recarregar } = useStreaming();
  const t = useT();
  const [erro, setErro] = useState(null);
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;
    try {
      deezerService.concluirLogin(window.location.hash);
      window.history.replaceState(null, '', window.location.pathname);
      recarregar().then(() => navegar('/configuracoes?conectado=deezer', { replace: true }));
    } catch (e) {
      setErro(e);
    }
  }, [navegar, recarregar]);

  if (erro) {
    return (
      <>
        <EstadoErro erro={erro} />
        <div style={{ textAlign: 'center' }}>
          <Botao variante="secundario" para="/configuracoes">{t('config.callback.voltar')}</Botao>
        </div>
      </>
    );
  }
  return <Carregando texto={t('config.callback.conectando', { servico: 'Deezer' })} />;
}
