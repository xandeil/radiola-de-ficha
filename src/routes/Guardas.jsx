import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Carregando } from '@/components/ui/Estados';
import { ehEquipe } from '@/utils/permissoes';
import { t } from '@/i18n';

/*
 * "Guardas" de rota (equivalente ao AuthMiddleware do PHP no documento).
 *
 * RotaPrivada: só entra logado (RNF021). Se não estiver, manda para o
 * login e guarda de onde veio, para voltar lá depois de entrar.
 * RotaPublica: telas de login/cadastro; se já estiver logado, pula para o dashboard.
 *
 * Importante: isso é só experiência do usuário. Segurança de verdade é o
 * back-end recusar requisições sem token válido.
 */

export function RotaPrivada() {
  const { autenticado, verificando } = useAuth();
  const local = useLocation();

  if (verificando) return <Carregando texto={t('comum.ligando')} />;
  if (!autenticado) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  return <Outlet />;
}

export function RotaPublica() {
  const { autenticado, verificando } = useAuth();

  if (verificando) return <Carregando texto={t('comum.ligando')} />;
  if (autenticado) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/**
 * Só a equipe (quem tem 'admin.acessar') entra no /admin.
 * Cliente comum que digita /admin na barra cai no "não encontrado" do app:
 * não confirmamos nem que a área existe.
 */
export function RotaEquipe() {
  const { usuario } = useAuth();
  if (!ehEquipe(usuario)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
