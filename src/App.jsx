import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { StreamingProvider } from '@/contexts/StreamingContext';
import { ToastProvider } from '@/contexts/ToastContext';
import AppRoutes from '@/routes/AppRoutes';

/*
 * Ordem dos Providers importa: quem está "por fora" fica disponível
 * para quem está "por dentro". O player depende do streaming (para o
 * fallback no Spotify), então o StreamingProvider fica por fora dele.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <StreamingProvider>
            <PlayerProvider>
              <AppRoutes />
            </PlayerProvider>
          </StreamingProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
