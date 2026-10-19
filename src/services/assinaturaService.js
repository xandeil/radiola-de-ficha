import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';
import { planosMock } from '@/mocks/assinatura';

/*
 * Planos e assinaturas (RF046–RF056).
 *
 * ⚠️ REGRA DE OURO DE PAGAMENTO: o número do cartão NUNCA passa por aqui.
 * O cartão é "tokenizado" no navegador pelo SDK do Mercado Pago (ou, no mock,
 * pelo formulário simulado) e este service recebe só um TOKEN + bandeira +
 * 4 últimos dígitos. Quem cobra de verdade é o back-end, com a chave secreta
 * (Access Token), que jamais vai para o front-end.
 *
 * No modo mock, este arquivo faz o papel do PHP: calcula valores, aplica
 * cupom, ativa a assinatura e simula o webhook do Mercado Pago.
 */

const DIA = 86400000;
const hojeISO = () => new Date().toISOString().slice(0, 10);
const somarDias = (iso, n) => new Date(new Date(`${iso}T12:00:00`).getTime() + n * DIA).toISOString().slice(0, 10);
const diasEntre = (de, ate) => Math.round((new Date(`${ate}T12:00:00`) - new Date(`${de}T12:00:00`)) / DIA);
const arred = (v) => Math.round(v * 100) / 100;

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

export const planoPorCodigo = (codigo) => planosMock.find((p) => p.codigo === codigo) || planosMock[0];
const planoPorId = (id) => planosMock.find((p) => p.id === id) || planosMock[0];
export const valorDoPlano = (p) => p.preco_mensal || p.preco_anual || 0;
export const cicloDoPlano = (p) => (p.preco_anual ? 'anual' : 'mensal');
const diasDoCiclo = (p) => (cicloDoPlano(p) === 'anual' ? 365 : 30);

// ---------- regras internas (no back real: AssinaturaController/PagamentoService) ----------

function assinaturaVigente(db, idUsuario) {
  return db.assinaturas
    .filter((a) => a.id_usuario === idUsuario && ['ativa', 'trial', 'cancelada'].includes(a.status))
    .sort((a, b) => b.id - a.id)[0] || null;
}

function sincronizarPlanoDoUsuario(db, idUsuario) {
  const usuario = db.usuarios.find((u) => u.id === idUsuario);
  const a = assinaturaVigente(db, idUsuario);
  const valida = a && a.data_expiracao >= hojeISO();
  usuario.plano = valida ? planoPorId(a.id_plano).codigo : 'gratuito';
}

/** Expira trials vencidos, encerra canceladas e renova cartões (o "cron" diário do back-end). */
function verificarExpiracoes(db, idUsuario) {
  const hoje = hojeISO();
  db.assinaturas
    .filter((a) => a.id_usuario === idUsuario && ['ativa', 'trial', 'cancelada'].includes(a.status) && a.data_expiracao < hoje)
    .forEach((a) => {
      if (a.status === 'ativa' && a.metodo_pagamento === 'cartao') {
        // Renovação automática no cartão salvo
        const plano = planoPorId(a.id_plano);
        const proximo = a.mudanca_agendada ? planoPorId(a.mudanca_agendada.id_plano) : plano;
        db.transacoes.push(novaTransacao(db, idUsuario, a.id, valorDoPlano(proximo), 'aprovada', 'cartao', { ...a.cartao, renovacao: true }, `Renovação ${proximo.nome}`));
        a.id_plano = proximo.id;
        a.data_expiracao = somarDias(a.data_expiracao, diasDoCiclo(proximo));
        a.proxima_cobranca = a.data_expiracao;
        delete a.mudanca_agendada;
      } else {
        a.status = 'expirada';
      }
    });
  sincronizarPlanoDoUsuario(db, idUsuario);
}

function novaTransacao(db, idUsuario, idAssinatura, valor, status, metodo, dados, descricao) {
  return {
    id: mockDb.proximoId(db.transacoes),
    id_usuario: idUsuario,
    id_assinatura: idAssinatura,
    valor: arred(valor),
    moeda: 'BRL',
    status,
    metodo_pagamento: metodo,
    id_transacao_mp: `MP-${Date.now().toString(36).toUpperCase()}`,
    dados_pagamento: dados,
    descricao,
    data_transacao: new Date().toISOString(),
  };
}

function validarCupomNoBanco(db, codigo, plano) {
  if (!codigo) return null;
  const c = db.cupons.find((x) => x.codigo.toUpperCase() === codigo.trim().toUpperCase() && x.ativo);
  const hoje = hojeISO();
  if (!c) throw new ApiError('Cupom não encontrado', 404);
  if (hoje < c.data_inicio || hoje > c.data_fim) throw new ApiError('Este cupom está fora da validade', 422);
  if (c.uso_maximo && c.usos_atual >= c.uso_maximo) throw new ApiError('Este cupom já atingiu o limite de usos', 422);
  if (c.plano_aplicavel && c.plano_aplicavel !== plano.id) throw new ApiError(`Este cupom vale só para o plano ${planoPorId(c.plano_aplicavel).nome}`, 422);
  return c;
}

/**
 * RF052 – Quanto cobrar agora.
 * Upgrade: desconta o crédito proporcional dos dias que sobraram do plano atual.
 *   crédito = valor pago × (dias restantes ÷ dias do ciclo)
 * Downgrade: não cobra nada agora; a troca fica agendada para o fim do período.
 */
function cotar(db, idUsuario, plano, codigoCupom) {
  const atual = assinaturaVigente(db, idUsuario);
  const planoAtual = atual ? planoPorId(atual.id_plano) : null;
  const linhas = [{ rotulo: plano.nome, valor: valorDoPlano(plano) }];
  let total = valorDoPlano(plano);

  const pagaAtual = atual && atual.status === 'ativa' && planoAtual.id !== 1;
  if (pagaAtual && planoAtual.id === plano.id) throw new ApiError('Você já está neste plano', 409);

  if (pagaAtual && valorDoPlano(plano) < valorDoPlano(planoAtual)) {
    return { agendado: true, a_partir_de: atual.data_expiracao, total: 0, linhas: [{ rotulo: `${plano.nome} a partir de ${atual.data_expiracao}`, valor: valorDoPlano(plano) }] };
  }

  if (pagaAtual) {
    const restantes = Math.max(0, diasEntre(hojeISO(), atual.data_expiracao));
    const credito = arred(valorDoPlano(planoAtual) * (restantes / diasDoCiclo(planoAtual)));
    if (credito > 0) {
      linhas.push({ rotulo: `Crédito de ${restantes} dias não usados do ${planoAtual.nome}`, valor: -credito });
      total -= credito;
    }
  }

  const cupom = validarCupomNoBanco(db, codigoCupom, plano);
  if (cupom) {
    const desconto = arred(cupom.tipo_desconto === 'percentual' ? total * (cupom.valor_desconto / 100) : Math.min(total, cupom.valor_desconto));
    linhas.push({ rotulo: `Cupom ${cupom.codigo} (${cupom.descricao})`, valor: -desconto });
    total -= desconto;
  }

  if (atual?.cupom_proximo && !cupom) {
    const c = db.cupons.find((x) => x.codigo === atual.cupom_proximo);
    if (c) {
      const desconto = arred(total * (c.valor_desconto / 100));
      linhas.push({ rotulo: `Oferta de retenção (${c.valor_desconto}%)`, valor: -desconto });
      total -= desconto;
    }
  }

  return { agendado: false, total: Math.max(0, arred(total)), linhas, cupom: cupom?.codigo || null };
}

function ativarPlano(db, idUsuario, plano, metodo, extras = {}) {
  db.assinaturas
    .filter((a) => a.id_usuario === idUsuario && ['ativa', 'trial', 'cancelada'].includes(a.status))
    .forEach((a) => {
      a.status = 'expirada';
      a.observacao = 'Substituída por mudança de plano';
    });
  const hoje = hojeISO();
  const assinatura = {
    id: mockDb.proximoId(db.assinaturas),
    id_usuario: idUsuario,
    id_plano: plano.id,
    status: 'ativa',
    data_inicio: hoje,
    data_expiracao: somarDias(hoje, diasDoCiclo(plano)),
    proxima_cobranca: somarDias(hoje, diasDoCiclo(plano)),
    metodo_pagamento: metodo,
    ...extras,
  };
  db.assinaturas.push(assinatura);
  sincronizarPlanoDoUsuario(db, idUsuario);
  return assinatura;
}

/** RF056 – avisos que aparecem no topo do app. */
function avisosDe(db, idUsuario, assinatura) {
  const avisos = [];
  const hoje = hojeISO();
  if (assinatura?.status === 'trial') {
    const dias = diasEntre(hoje, assinatura.trial_ends);
    avisos.push({ tipo: dias <= 2 ? 'aviso' : 'info', texto: dias <= 0 ? 'Seu teste grátis termina hoje.' : `Seu teste grátis termina em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`, acao: 'Assinar agora' });
  }
  if (assinatura?.status === 'cancelada') {
    avisos.push({ tipo: 'aviso', texto: `Sua assinatura foi cancelada e vale até ${assinatura.data_expiracao.split('-').reverse().join('/')}.`, acao: 'Reativar' });
  }
  if (assinatura?.status === 'ativa' && diasEntre(hoje, assinatura.data_expiracao) <= 3 && assinatura.metodo_pagamento !== 'cartao') {
    avisos.push({ tipo: 'aviso', texto: 'Sua assinatura vence em breve. Pague o Pix ou boleto para não perder o Premium.', acao: 'Renovar' });
  }
  const pendente = db.transacoes.find((t) => t.id_usuario === idUsuario && t.status === 'pendente');
  if (pendente) avisos.push({ tipo: 'info', texto: `Pagamento de R$ ${pendente.valor.toFixed(2).replace('.', ',')} aguardando confirmação.`, acao: 'Ver pagamento', id_transacao: pendente.id });
  const recusada = db.transacoes.filter((t) => t.id_usuario === idUsuario).sort((a, b) => b.id - a.id)[0];
  if (recusada?.status === 'recusada') avisos.push({ tipo: 'erro', texto: 'Seu último pagamento foi recusado.', acao: 'Tentar de novo' });
  return avisos;
}

// ---------- API pública ----------
export const assinaturaService = {
  async planos() {
    if (!USE_MOCK) return http('/planos');
    await atraso(150);
    return planosMock;
  },

  /** RF051 – Painel: plano atual, assinatura, histórico e avisos. */
  async minha() {
    if (!USE_MOCK) return http('/assinatura');
    await atraso(200);
    const db = mockDb.ler();
    const meuId = eu();
    verificarExpiracoes(db, meuId);
    mockDb.salvar(db);

    const assinatura = assinaturaVigente(db, meuId);
    const valida = assinatura && assinatura.data_expiracao >= hojeISO();
    const plano = valida ? planoPorId(assinatura.id_plano) : planosMock[0];
    return {
      plano,
      assinatura: valida ? assinatura : null,
      premium: plano.id !== 1,
      emTrial: assinatura?.status === 'trial' && valida,
      trialDisponivel: !db.assinaturas.some((a) => a.id_usuario === meuId), // RF054: uma vez por usuário
      transacoes: db.transacoes.filter((t) => t.id_usuario === meuId).sort((a, b) => b.id - a.id),
      membrosFamilia: db.membros_familia.filter((m) => m.id_titular === meuId),
      avisos: avisosDe(db, meuId, valida ? assinatura : null),
    };
  },

  /** RF054 – 7 dias grátis do Premium Mensal, uma única vez. */
  async iniciarTrial() {
    if (!USE_MOCK) return http('/assinatura/trial', { method: 'POST' });
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    if (db.assinaturas.some((a) => a.id_usuario === meuId)) throw new ApiError('O teste grátis só pode ser usado uma vez por conta', 409);
    const fim = somarDias(hojeISO(), 7);
    db.assinaturas.push({ id: mockDb.proximoId(db.assinaturas), id_usuario: meuId, id_plano: 2, status: 'trial', data_inicio: hojeISO(), trial_ends: fim, data_expiracao: fim, metodo_pagamento: 'nao_aplicavel' });
    sincronizarPlanoDoUsuario(db, meuId);
    mockDb.salvar(db);
    return { ok: true, trial_ends: fim };
  },

  /** RF052 + RF055 – Resumo do que será cobrado (com crédito proporcional e cupom). */
  async cotacao(codigoPlano, cupom) {
    if (!USE_MOCK) return http('/assinatura/cotacao', { method: 'POST', body: { plano: codigoPlano, cupom } });
    await atraso(200);
    const db = mockDb.ler();
    return cotar(db, eu(), planoPorCodigo(codigoPlano), cupom);
  },

  /**
   * Processa o pagamento. "pagamento" traz:
   *  - metodo: 'cartao' | 'pix' | 'boleto'
   *  - cartao: { token, bandeira, ultimos4, parcelas, titular }  (NUNCA o número)
   *  - pagador: { email, cpf }
   */
  async pagar({ codigoPlano, cupom, pagamento, comprovante }) {
    if (!USE_MOCK) return http('/pagamentos', { method: 'POST', body: { plano: codigoPlano, cupom, pagamento, comprovante } });
    await atraso(900); // simula o tempo de resposta do gateway

    const db = mockDb.ler();
    const meuId = eu();
    const plano = planoPorCodigo(codigoPlano);
    if (plano.exige_comprovante && !comprovante) throw new ApiError('Envie o comprovante de matrícula para o plano Universitário', 422);

    const cotacao = cotar(db, meuId, plano, cupom);
    if (cotacao.agendado) {
      const atual = assinaturaVigente(db, meuId);
      atual.mudanca_agendada = { id_plano: plano.id, a_partir_de: atual.data_expiracao };
      mockDb.salvar(db);
      return { agendado: true, a_partir_de: atual.data_expiracao };
    }

    let status = 'pendente';
    let dados = {};
    let motivo = null;
    if (pagamento.metodo === 'cartao') {
      const c = pagamento.cartao;
      if (!c?.token) throw new ApiError('Cartão não tokenizado', 422);
      // Mesma convenção dos cartões de teste do Mercado Pago: o NOME do titular decide o resultado
      const nome = (c.titular || '').trim().toUpperCase();
      status = nome === 'OTHE' ? 'recusada' : nome === 'CONT' ? 'pendente' : 'aprovada';
      if (status === 'recusada') motivo = 'Pagamento recusado pelo banco emissor. Tente outro cartão.';
      dados = { bandeira: c.bandeira, ultimos4: c.ultimos4, parcelas: c.parcelas || 1 };
    } else if (pagamento.metodo === 'pix') {
      const txid = `RADIOLA${Date.now().toString(36).toUpperCase()}`;
      dados = {
        // Formato "copia e cola" no padrão EMV do Banco Central (este é FICTÍCIO, só para demonstração)
        copia_cola: `00020126580014BR.GOV.BCB.PIX0136radiola-demo@example.com5204000053039865406${cotacao.total.toFixed(2)}5802BR5915RADIOLA DE FICHA6006RECIFE62${String(txid.length + 4).padStart(2, '0')}05${String(txid.length).padStart(2, '0')}${txid}6304ABCD`,
        expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    } else if (pagamento.metodo === 'boleto') {
      dados = {
        linha_digitavel: `34191.79001 01043.510047 91020.150008 ${Math.floor(Math.random() * 9)} ${String(Math.round(cotacao.total * 100)).padStart(14, '0')}`,
        vencimento: somarDias(hojeISO(), 3),
      };
    }

    const transacao = novaTransacao(db, meuId, null, cotacao.total, status, pagamento.metodo, { ...dados, plano: plano.codigo, cupom: cotacao.cupom, comprovante: comprovante?.nome || null, motivo }, plano.nome);
    db.transacoes.push(transacao);

    if (status === 'aprovada') {
      const assinatura = ativarPlano(db, meuId, plano, 'cartao', { cartao: dados, comprovante });
      transacao.id_assinatura = assinatura.id;
      if (cotacao.cupom) db.cupons.find((c) => c.codigo === cotacao.cupom).usos_atual++;
    }
    mockDb.salvar(db);
    return { transacao };
  },

  /** Consultado em intervalos (polling) enquanto um Pix ou boleto está pendente. */
  async statusPagamento(idTransacao) {
    if (!USE_MOCK) return http(`/pagamentos/${idTransacao}`);
    await atraso(150);
    const db = mockDb.ler();
    const t = db.transacoes.find((x) => x.id === Number(idTransacao) && x.id_usuario === eu());
    if (!t) throw new ApiError('Pagamento não encontrado', 404);
    return t;
  },

  /**
   * SÓ NO MOCK: faz o papel do WEBHOOK do Mercado Pago.
   * Na vida real, quando o cliente paga o Pix, o Mercado Pago chama uma URL
   * do SEU back-end (POST /webhooks/mercadopago) avisando. O PHP confere o
   * pagamento na API do MP e ativa a assinatura. O front só fica perguntando
   * "já pagou?" (statusPagamento) até a resposta mudar.
   */
  async simularConfirmacao(idTransacao) {
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    const t = db.transacoes.find((x) => x.id === Number(idTransacao) && x.id_usuario === meuId);
    if (!t || t.status !== 'pendente') return t;
    t.status = 'aprovada';
    const assinatura = ativarPlano(db, meuId, planoPorCodigo(t.dados_pagamento.plano), t.metodo_pagamento);
    t.id_assinatura = assinatura.id;
    if (t.dados_pagamento.cupom) {
      const c = db.cupons.find((x) => x.codigo === t.dados_pagamento.cupom);
      if (c) c.usos_atual++;
    }
    mockDb.salvar(db);
    return t;
  },

  /**
   * RF053 + seção 9.4 (retenção). Se o usuário aceitar a oferta, NÃO cancela:
   * o próximo ciclo sai com 50% de desconto. Caso contrário, cancela mas
   * mantém o acesso até o fim do período já pago.
   */
  async cancelar({ motivo, detalhe, aceitouOferta }) {
    if (!USE_MOCK) return http('/assinatura/cancelar', { method: 'POST', body: { motivo, detalhe, aceitouOferta } });
    await atraso(400);
    const db = mockDb.ler();
    const meuId = eu();
    const a = assinaturaVigente(db, meuId);
    if (!a || !['ativa', 'trial'].includes(a.status)) throw new ApiError('Não há assinatura ativa para cancelar', 409);

    db.motivos_cancelamento.push({ id: mockDb.proximoId(db.motivos_cancelamento), id_assinatura: a.id, motivo_principal: motivo, motivo_detalhado: detalhe, aceitou_oferta_retencao: Boolean(aceitouOferta), data_cancelamento: new Date().toISOString() });

    if (aceitouOferta) {
      a.cupom_proximo = 'VOLTA50';
    } else if (a.status === 'trial') {
      a.status = 'expirada'; // teste cancelado encerra na hora
      a.data_expiracao = somarDias(hojeISO(), -1);
    } else {
      a.status = 'cancelada';
      a.data_cancelamento = hojeISO();
    }
    sincronizarPlanoDoUsuario(db, meuId);
    mockDb.salvar(db);
    return a;
  },

  async reativar() {
    if (!USE_MOCK) return http('/assinatura/reativar', { method: 'POST' });
    await atraso(300);
    const db = mockDb.ler();
    const a = assinaturaVigente(db, eu());
    if (a?.status !== 'cancelada') throw new ApiError('Nada para reativar', 409);
    a.status = 'ativa';
    delete a.data_cancelamento;
    mockDb.salvar(db);
    return a;
  },

  async desfazerMudancaAgendada() {
    if (!USE_MOCK) return http('/assinatura/mudanca', { method: 'DELETE' });
    const db = mockDb.ler();
    const a = assinaturaVigente(db, eu());
    if (a) delete a.mudanca_agendada;
    mockDb.salvar(db);
    return a;
  },

  // ---------- RF049: Plano Família ----------
  async adicionarMembroFamilia(email) {
    if (!USE_MOCK) return http('/familia/membros', { method: 'POST', body: { email } });
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    const membros = db.membros_familia.filter((m) => m.id_titular === meuId);
    if (membros.length >= 4) throw new ApiError('O plano Família permite o titular + 4 pessoas', 422);
    if (membros.some((m) => m.email === email.toLowerCase())) throw new ApiError('Essa pessoa já foi convidada', 409);
    const membro = { id: mockDb.proximoId(db.membros_familia), id_titular: meuId, email: email.toLowerCase(), status: 'convidado', catalogo: 'separado', data: new Date().toISOString() };
    db.membros_familia.push(membro);
    mockDb.salvar(db);
    return membro;
  },

  async removerMembroFamilia(id) {
    if (!USE_MOCK) return http(`/familia/membros/${id}`, { method: 'DELETE' });
    const db = mockDb.ler();
    db.membros_familia = db.membros_familia.filter((m) => !(m.id === id && m.id_titular === eu()));
    mockDb.salvar(db);
    return { ok: true };
  },
};
