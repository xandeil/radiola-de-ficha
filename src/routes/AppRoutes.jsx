import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaPrivada, RotaPublica } from './Guardas';
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import CadastroPage from '@/pages/auth/CadastroPage';
import RecuperarSenhaPage from '@/pages/auth/RecuperarSenhaPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CatalogoPage from '@/pages/catalogo/CatalogoPage';
import ItemDetalhePage from '@/pages/catalogo/ItemDetalhePage';
import ItemFormularioPage from '@/pages/catalogo/ItemFormularioPage';
import PlayerPage from '@/pages/player/PlayerPage';
import BuscaPage from '@/pages/busca/BuscaPage';
import ConfiguracoesPage from '@/pages/configuracoes/ConfiguracoesPage';
import SpotifyCallbackPage from '@/pages/callback/SpotifyCallbackPage';
import FeedPage from '@/pages/social/FeedPage';
import PerfilPage from '@/pages/social/PerfilPage';
import AmigosPage from '@/pages/social/AmigosPage';
import GruposPage from '@/pages/social/GruposPage';
import GrupoPage from '@/pages/social/GrupoPage';
import ConquistasPage from '@/pages/social/ConquistasPage';
import ScannerPage from '@/pages/scanner/ScannerPage';
import PlanosPage from '@/pages/assinatura/PlanosPage';
import CheckoutPage from '@/pages/assinatura/CheckoutPage';
import PagamentoPage from '@/pages/assinatura/PagamentoPage';
import MinhaAssinaturaPage from '@/pages/assinatura/MinhaAssinaturaPage';
import RecursoPremium from '@/components/assinatura/RecursoPremium';
import NaoEncontradaPage from '@/pages/erros/NaoEncontradaPage';

/*
 * Mapa de rotas (equivalente ao Routes.php do documento).
 * Rotas aninhadas: o elemento "pai" (guarda ou layout) envolve os filhos,
 * então a regra "precisa estar logado" é escrita UMA vez para todas.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
        </Route>
      </Route>

      <Route element={<RotaPrivada />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/catalogo/novo" element={<ItemFormularioPage />} />
          <Route path="/catalogo/:id" element={<ItemDetalhePage />} />
          <Route path="/catalogo/:id/editar" element={<ItemFormularioPage />} />
          <Route path="/player" element={<PlayerPage />} />
          <Route path="/busca" element={<BuscaPage />} />
          <Route
            path="/scanner"
            element={
              <RecursoPremium
                recurso="scanner"
                titulo="Scanner de código de barras"
                descricao="Aponte a câmera para o código do disco e a ficha se preenche sozinha. Recurso da Radiola Completa."
              >
                <ScannerPage />
              </RecursoPremium>
            }
          />
          <Route path="/planos" element={<PlanosPage />} />
          <Route path="/assinatura" element={<MinhaAssinaturaPage />} />
          <Route path="/assinatura/checkout/:codigo" element={<CheckoutPage />} />
          <Route path="/assinatura/pagamento/:id" element={<PagamentoPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/callback/spotify" element={<SpotifyCallbackPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/perfil/:apelido" element={<PerfilPage />} />
          <Route path="/amigos" element={<AmigosPage />} />
          <Route path="/grupos" element={<GruposPage />} />
          <Route path="/grupos/:id" element={<GrupoPage />} />
          <Route path="/conquistas" element={<ConquistasPage />} />
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
