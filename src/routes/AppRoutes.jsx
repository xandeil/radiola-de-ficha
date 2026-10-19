import { lazy } from 'react';
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
import SuportePage from '@/pages/suporte/SuportePage';
import ArtigoPage from '@/pages/suporte/ArtigoPage';
import NovoTicketPage from '@/pages/suporte/NovoTicketPage';
import TicketPage from '@/pages/suporte/TicketPage';
// Painel admin em "lazy": o código só é baixado por quem abre o /admin.
// Cliente comum nunca baixa essas telas (app mais leve e menos superfície exposta).
import AdminLayout, { ExigePermissao } from '@/components/admin/AdminLayout';
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsuariosPage = lazy(() => import('@/pages/admin/AdminUsuariosPage'));
const AdminUsuarioPage = lazy(() => import('@/pages/admin/AdminUsuarioPage'));
const AdminTicketsPage = lazy(() => import('@/pages/admin/AdminTicketsPage'));
const AdminTicketPage = lazy(() => import('@/pages/admin/AdminTicketPage'));
const AdminCrmPage = lazy(() => import('@/pages/admin/AdminCrmPage'));
const AdminFinanceiroPage = lazy(() => import('@/pages/admin/AdminFinanceiroPage'));
const AdminBackupPage = lazy(() => import('@/pages/admin/AdminBackupPage'));
const AdminLogsPage = lazy(() => import('@/pages/admin/AdminLogsPage'));
const AdminManutencaoPage = lazy(() => import('@/pages/admin/AdminManutencaoPage'));
import ManutencaoPage from '@/pages/manutencao/ManutencaoPage';
import PortaoManutencao from '@/components/manutencao/PortaoManutencao';
import { RotaEquipe } from './Guardas';

/** Atalho: página do admin protegida por uma permissão específica. */
const protegida = (permissao, elemento) => <ExigePermissao permissao={permissao}>{elemento}</ExigePermissao>;

/*
 * Mapa de rotas (equivalente ao Routes.php do documento).
 * Rotas aninhadas: o elemento "pai" (guarda ou layout) envolve os filhos,
 * então a regra "precisa estar logado" é escrita UMA vez para todas.
 */
export default function AppRoutes() {
  return (
    <PortaoManutencao>
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
          <Route path="/suporte" element={<SuportePage />} />
          <Route path="/suporte/novo" element={<NovoTicketPage />} />
          <Route path="/suporte/artigos/:slug" element={<ArtigoPage />} />
          <Route path="/suporte/tickets/:id" element={<TicketPage />} />
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>

        {/* Painel administrativo: layout próprio e só para a equipe */}
        <Route element={<RotaEquipe />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={protegida('dashboard.ver', <AdminDashboardPage />)} />
            <Route path="/admin/usuarios" element={protegida('usuarios.ver', <AdminUsuariosPage />)} />
            <Route path="/admin/usuarios/:id" element={protegida('usuarios.ver', <AdminUsuarioPage />)} />
            <Route path="/admin/tickets" element={protegida('tickets.ver', <AdminTicketsPage />)} />
            <Route path="/admin/tickets/:id" element={protegida('tickets.ver', <AdminTicketPage />)} />
            <Route path="/admin/crm" element={protegida('crm.ver', <AdminCrmPage />)} />
            <Route path="/admin/financeiro" element={protegida('assinaturas.ver', <AdminFinanceiroPage />)} />
            <Route path="/admin/backup" element={protegida('backup.ver', <AdminBackupPage />)} />
            <Route path="/admin/logs" element={protegida('logs.ver', <AdminLogsPage />)} />
            <Route path="/admin/manutencao" element={protegida('*', <AdminManutencaoPage />)} />
          </Route>
          <Route path="/manutencao/previa" element={protegida('*', <ManutencaoPage previa />)} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </PortaoManutencao>
  );
}
