import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';

/*
 * Autenticação. Cada função tem dois caminhos: mock e API real.
 * As páginas não sabem (nem precisam saber) qual está ativo.
 */

const semSenha = ({ senha, ...usuario }) => usuario;

/** Junta ao usuário os papéis e as permissões (o "JOIN" com usuarios_papeis e papeis). */
function comPermissoes(db, usuario) {
  const idsPapeis = (db.usuarios_papeis || []).filter((r) => r.id_usuario === usuario.id).map((r) => r.id_papel);
  const papeis = (db.papeis || []).filter((p) => idsPapeis.includes(p.id));
  return {
    ...semSenha(usuario),
    papeis: papeis.map((p) => p.nome),
    nivel: Math.max(10, ...papeis.map((p) => p.nivel)),
    permissoes: [...new Set(papeis.flatMap((p) => p.permissoes))],
  };
}

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
    if (usuario.ativo === false) throw new ApiError('Esta conta está suspensa. Fale com o suporte.', 403);
    const db = mockDb.ler();
    const registro = db.usuarios.find((u) => u.id === usuario.id);
    registro.ultimo_login = new Date().toISOString();
    mockDb.salvar(db);
    tokenStorage.set(`mock-token-${usuario.id}`);
    return comPermissoes(db, registro);
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
    novo.ativo = true;
    novo.ultimo_login = new Date().toISOString();
    db.usuarios.push(novo);
    mockDb.salvar(db);
    tokenStorage.set(`mock-token-${novo.id}`);
    return comPermissoes(db, novo);
  },

  async usuarioAtual() {
    const token = tokenStorage.get();
    if (!token) return null;

    if (!USE_MOCK) return http('/auth/me');

    await atraso(150);
    const id = Number(token.replace('mock-token-', ''));
    const db = mockDb.ler();
    const usuario = db.usuarios.find((u) => u.id === id);
    if (!usuario || usuario.ativo === false) return null; // conta suspensa derruba a sessão
    return comPermissoes(db, usuario);
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
    return comPermissoes(db, usuario);
  },

  logout() {
    tokenStorage.clear();
  },
};
