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
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
