import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';

/*
 * Context = um "estado global" que qualquer componente pode ler sem
 * precisar receber por props de pai em pai (o famoso prop drilling).
 * Aqui guardamos quem está logado.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true); // checando token salvo ao abrir o app

  useEffect(() => {
    authService
      .usuarioAtual()
      .then(setUsuario)
      .catch(() => authService.logout())
      .finally(() => setVerificando(false));
  }, []);

  const login = useCallback(async (email, senha) => {
    const u = await authService.login(email, senha);
    setUsuario(u);
    return u;
  }, []);

  const registrar = useCallback(async (dados) => {
    const u = await authService.registrar(dados);
    setUsuario(u);
    return u;
  }, []);

  const atualizarPerfil = useCallback(async (dados) => {
    const u = await authService.atualizarPerfil(dados);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUsuario(null);
  }, []);

  // useMemo evita recriar o objeto a cada render, o que re-renderizaria
  // todos os componentes que usam o contexto sem necessidade.
  const valor = useMemo(
    () => ({ usuario, verificando, autenticado: !!usuario, login, registrar, atualizarPerfil, logout }),
    [usuario, verificando, login, registrar, atualizarPerfil, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
