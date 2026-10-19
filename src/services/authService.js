import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';

/*
 * Autenticação. Cada função tem dois caminhos: mock e API real.
 * As páginas não sabem (nem precisam saber) qual está ativo.
 */

const semSenha = ({ senha, ...usuario }) => usuario;

export const authService = {
  async login(email, senha) {
    if (!USE_MOCK) {
      const { token, usuario } = await http('/auth/login', { method: 'POST', body: { email, senha } });
      tokenStorage.set(token);
      return usuario;
    }

    await atraso();
    const usuario = mockDb.ler().usuarios.find((u) => u.email === email.trim().toLowerCase());
    // Mensagem genérica de propósito: não revelar se o e-mail existe (boa prática de segurança)
    if (!usuario || usuario.senha !== senha) throw new ApiError('E-mail ou senha inválidos', 401);
    tokenStorage.set(`mock-token-${usuario.id}`);
    return semSenha(usuario);
  },

  async registrar({ nome, email, senha }) {
    if (!USE_MOCK) {
      const { token, usuario } = await http('/auth/register', { method: 'POST', body: { nome, email, senha } });
      tokenStorage.set(token);
      return usuario;
    }

    await atraso();
    const db = mockDb.ler();
    const emailNormalizado = email.trim().toLowerCase();
    if (db.usuarios.some((u) => u.email === emailNormalizado)) {
      throw new ApiError('Já existe uma conta com este e-mail', 409);
    }
    const novo = {
      id: mockDb.proximoId(db.usuarios),
      nome: nome.trim(),
      email: emailNormalizado,
      senha,
      apelido: '',
      tema_preferido: 'auto',
      plano: 'gratuito',
    };
    db.usuarios.push(novo);
    mockDb.salvar(db);
    tokenStorage.set(`mock-token-${novo.id}`);
    return semSenha(novo);
  },

  async usuarioAtual() {
    const token = tokenStorage.get();
    if (!token) return null;

    if (!USE_MOCK) return http('/auth/me');

    await atraso(150);
    const id = Number(token.replace('mock-token-', ''));
    const usuario = mockDb.ler().usuarios.find((u) => u.id === id);
    return usuario ? semSenha(usuario) : null;
  },

  async solicitarRecuperacao(email) {
    if (!USE_MOCK) return http('/auth/forgot-password', { method: 'POST', body: { email } });
    await atraso();
    return { ok: true }; // sempre "ok", também para não revelar e-mails cadastrados
  },

  logout() {
    tokenStorage.clear();
  },
};
