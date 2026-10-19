import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import AppRoutes from '@/routes/AppRoutes';

/*
 * Ordem dos Providers importa: quem está "por fora" fica disponível
 * para quem está "por dentro". As rotas precisam do usuário e do player,
 * então os dois envolvem o AppRoutes.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <AppRoutes />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
