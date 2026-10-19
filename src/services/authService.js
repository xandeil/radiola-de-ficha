import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';

/*
 * Autenticação. Cada função tem dois caminhos: mock e API real.
 * As páginas não sabem (nem precisam saber) qual está ativo.
 */

const semSenha = ({ senha, ...usuario }) => usuario;

/** "Maria Souza" -> "mariasouza" (sem acento, só letras e números) */
const slug = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'colecionador';

function apelidoUnico(usuarios, base) {
  let apelido = slug(base);
  let n = 2;
  while (usuarios.some((u) => u.apelido === apelido)) apelido = `${slug(base)}${n++}`;
  return apelido;
}

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
      apelido: apelidoUnico(db.usuarios, nome),
      bio: '',
      data_cadastro: new Date().toISOString(),
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

  /** Perfil público (RF057): nome, apelido (vira a URL /perfil/apelido) e bio. */
  async atualizarPerfil({ nome, apelido, bio }) {
    if (!USE_MOCK) return http('/auth/me', { method: 'PATCH', body: { nome, apelido, bio } });
    await atraso();
    const db = mockDb.ler();
    const id = Number(tokenStorage.get().replace('mock-token-', ''));
    const usuario = db.usuarios.find((u) => u.id === id);
    const novoApelido = slug(apelido || nome);
    if (db.usuarios.some((u) => u.id !== id && u.apelido === novoApelido)) {
      throw new ApiError('Esse apelido já está em uso', 409);
    }
    Object.assign(usuario, { nome: nome.trim(), apelido: novoApelido, bio: bio.trim() });
    mockDb.salvar(db);
    return semSenha(usuario);
  },

  logout() {
    tokenStorage.clear();
  },
};
