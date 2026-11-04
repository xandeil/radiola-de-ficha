import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { StreamingProvider } from '@/contexts/StreamingContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PlanoProvider } from '@/contexts/PlanoContext';
import { ManutencaoProvider } from '@/contexts/ManutencaoContext';
import { I18nProvider } from '@/contexts/I18nContext';
import SincronizarIdioma from '@/components/layout/SincronizarIdioma';
import AppRoutes from '@/routes/AppRoutes';

/*
 * Ordem dos Providers importa: quem está "por fora" fica disponível
 * para quem está "por dentro".
 * - Idioma fica por fora de tudo: até o toast e a tela de manutenção traduzem.
 * - O player depende do streaming (fallback) e do plano (anúncios),
 *   então os dois ficam por fora dele.
 */
export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <SincronizarIdioma />
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
      </I18nProvider>
    </BrowserRouter>
  );
}
