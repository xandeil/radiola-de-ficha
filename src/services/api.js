/*
 * Cliente HTTP central.
 *
 * Toda chamada ao back-end passa por aqui. Vantagens:
 *  - O token de autenticação é anexado num único lugar.
 *  - Erros chegam padronizados (sempre um Error com .status e .message).
 *  - Trocar fetch por axios no futuro mexe em um arquivo só.
 *
 * As páginas NUNCA chamam este arquivo direto: elas chamam os "services"
 * (catalogoService, authService), que decidem entre mock e API real.
 */

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'radiola.token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status = 0, detalhes = null) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
  }
}

export async function http(caminho, { method = 'GET', body, headers = {} } = {}) {
  const token = tokenStorage.get();

  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // RNF047: durante a manutenção a API responde 503. Avisamos o app para ele
    // checar o status na hora, em vez de esperar o próximo ciclo de 60 segundos.
    if (resposta.status === 503) window.dispatchEvent(new Event('radiola:manutencao'));
    throw new ApiError(dados?.mensagem || 'Erro ao comunicar com o servidor', resposta.status, dados);
  }
  return dados;
}

/** Simula a latência da rede no modo mock, para os loadings aparecerem de verdade. */
export const atraso = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
