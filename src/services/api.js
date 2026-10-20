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

import { idiomaAtual, t as traduzir } from '@/i18n';

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

/*
 * Modo offline (RF093 / RNF016): a última resposta de algumas leituras fica
 * guardada no aparelho. Sem internet, devolvemos essa cópia (só leitura).
 * Só entram rotas do PRÓPRIO usuário e nada de pagamento; tudo é apagado no logout.
 */
const PREFIXO_OFFLINE = 'radiola.offline.';
const ROTAS_OFFLINE = [/^\/auth\/me$/, /^\/itens(\?.*)?$/, /^\/itens\/\d+$/, /^\/planos$/];
const guardarOffline = (caminho, dados) => {
  if (!ROTAS_OFFLINE.some((r) => r.test(caminho))) return;
  try {
    const texto = JSON.stringify(dados);
    if (texto.length < 1_500_000) localStorage.setItem(PREFIXO_OFFLINE + caminho, texto);
  } catch {
    /* armazenamento cheio: segue sem cópia */
  }
};
const lerOffline = (caminho) => {
  try {
    const texto = localStorage.getItem(PREFIXO_OFFLINE + caminho);
    return texto ? JSON.parse(texto) : undefined;
  } catch {
    return undefined;
  }
};
export const limparCopiasOffline = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIXO_OFFLINE))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nada a limpar */
  }
};

export async function http(caminho, { method = 'GET', body, headers = {} } = {}) {
  const token = tokenStorage.get();

  let resposta;
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // RNF020: o PHP responde mensagens de erro no idioma do usuário
        'Accept-Language': idiomaAtual(),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch só "explode" (TypeError) quando nem chegou ao servidor: sem rede, DNS, CORS...
    const copia = method === 'GET' ? lerOffline(caminho) : undefined;
    if (copia !== undefined) return copia;
    throw new ApiError(traduzir('pwa.semConexao'), 0);
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // RNF047: durante a manutenção a API responde 503. Avisamos o app para ele
    // checar o status na hora, em vez de esperar o próximo ciclo de 60 segundos.
    if (resposta.status === 503) window.dispatchEvent(new Event('radiola:manutencao'));
    throw new ApiError(dados?.mensagem || traduzir('erros.servidor'), resposta.status, dados);
  }
  if (method === 'GET') guardarOffline(caminho, dados);
  return dados;
}

/** Simula a latência da rede no modo mock, para os loadings aparecerem de verdade. */
export const atraso = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
