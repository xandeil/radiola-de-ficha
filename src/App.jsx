import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { StreamingProvider } from '@/contexts/StreamingContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PlanoProvider } from '@/contexts/PlanoContext';
import { ManutencaoProvider } from '@/contexts/ManutencaoContext';
import AppRoutes from '@/routes/AppRoutes';

/*
 * Ordem dos Providers importa: quem está "por fora" fica disponível
 * para quem está "por dentro". O player depende do streaming (para o
 * fallback no Spotify) e do plano (anúncios), então os dois ficam por fora dele.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ManutencaoProvider>
          <PlanoProvider>
            <StreamingProvider>
              <PlayerProvider>
                <AppRoutes />
              </PlayerProvider>
            </StreamingProvider>
          </PlanoProvider>
          </ManutencaoProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
