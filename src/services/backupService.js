import { USE_MOCK, http, atraso, tokenStorage, ApiError } from './api';
import { mockDb } from './mockDb';
import { planoPorCodigo } from './assinaturaService';

/*
 * Backup do USUÁRIO (RF094, RF095, seção 7.2).
 *
 *  - Exportar: baixa um JSON com toda a coleção. Disponível em TODOS os
 *    planos (no gratuito é a única forma de backup, como diz a tabela 7.2).
 *  - Importar: lê esse JSON, VALIDA cada item e mescla ou substitui.
 *  - Backups automáticos: o sistema faz um backup diário do banco inteiro;
 *    o assinante pode pedir a restauração da coleção de uma data, dentro da
 *    retenção do plano (7 ou 30 dias). Quem executa é a equipe (adminService).
 *
 * Regra de ouro de importação: NUNCA confie no arquivo. Ele pode ter sido
 * editado à mão, vir de outra versão do app ou ser malicioso. Validamos
 * tipo de cada campo e ignoramos o que não reconhecemos.
 */

const FORMATO = 'radiola-de-ficha/backup';
const VERSAO_FORMATO = 1;
const TIPOS = ['LP', 'CD', 'DVD', 'K7', 'Outro'];

const eu = () => Number((tokenStorage.get() || '').replace('mock-token-', ''));

/** Remove campos internos (id_usuario, ids de banco) para o arquivo valer em qualquer conta. */
function itemParaArquivo({ id, id_usuario, ...resto }) {
  return { ...resto, id_original: id, faixas: (resto.faixas || []).map(({ id: idFaixa, ...f }) => ({ ...f, id_original: idFaixa })) };
}

function validarItem(bruto, indice) {
  const erros = [];
  if (!bruto || typeof bruto !== 'object') return { erros: [`Item ${indice + 1}: formato inválido`] };
  if (typeof bruto.titulo !== 'string' || !bruto.titulo.trim()) erros.push(`Item ${indice + 1}: sem título`);
  if (!TIPOS.includes(bruto.tipo_midia)) erros.push(`Item ${indice + 1} ("${bruto.titulo || '?'}"): formato "${bruto.tipo_midia}" desconhecido`);
  if (bruto.faixas && !Array.isArray(bruto.faixas)) erros.push(`Item ${indice + 1}: faixas inválidas`);
  if (erros.length) return { erros };

  // Lista branca de campos: o que não está aqui é descartado
  const texto = (v) => (typeof v === 'string' ? v.slice(0, 500) : '');
  const numero = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null);
  return {
    erros: [],
    item: {
      titulo: bruto.titulo.trim().slice(0, 255),
      artista: texto(bruto.artista),
      tipo_midia: bruto.tipo_midia,
      subtipo: texto(bruto.subtipo),
      genero: texto(bruto.genero),
      ano_lancamento: numero(bruto.ano_lancamento),
      ano_gravacao: numero(bruto.ano_gravacao),
      gravadora: texto(bruto.gravadora),
      pais_origem: texto(bruto.pais_origem),
      numero_catalogo: texto(bruto.numero_catalogo),
      codigo_barras: texto(bruto.codigo_barras).replace(/\D/g, ''),
      velocidade: texto(bruto.velocidade) || 'N/A',
      cor_vinil: texto(bruto.cor_vinil),
      duracao_total_min: numero(bruto.duracao_total_min),
      lado_a_duracao_min: numero(bruto.lado_a_duracao_min),
      lado_b_duracao_min: numero(bruto.lado_b_duracao_min),
      cor_fita: texto(bruto.cor_fita),
      digitalizada: Boolean(bruto.digitalizada),
      regiao_dvd: texto(bruto.regiao_dvd),
      estado_conservacao: texto(bruto.estado_conservacao),
      estado_capa: texto(bruto.estado_capa),
      preco_pago: numero(bruto.preco_pago),
      valor_estimado: numero(bruto.valor_estimado),
      notas_pessoais: typeof bruto.notas_pessoais === 'string' ? bruto.notas_pessoais.slice(0, 5000) : '',
      cor_capa: /^#[0-9a-f]{6}$/i.test(bruto.cor_capa || '') ? bruto.cor_capa : '#6e6055',
      capa_imagem: /^https:\/\//.test(bruto.capa_imagem || '') ? bruto.capa_imagem : '', // só https: nada de javascript:
      publico: Boolean(bruto.publico),
      localizacao: {
        local_principal: texto(bruto.localizacao?.local_principal) || 'Sem local',
        movel: texto(bruto.localizacao?.movel),
        prateleira: texto(bruto.localizacao?.prateleira),
        posicao: texto(bruto.localizacao?.posicao),
      },
      faixas: (bruto.faixas || [])
        .filter((f) => f && typeof f.titulo === 'string')
        .slice(0, 200)
        .map((f, i) => ({
          numero: numero(f.numero) || i + 1,
          lado: ['A', 'B', 'C', 'D'].includes(f.lado) ? f.lado : null,
          titulo: f.titulo.slice(0, 255),
          duracao_segundos: numero(f.duracao_segundos),
          compositores: texto(f.compositores),
        })),
      anotacoes: bruto.anotacoes && typeof bruto.anotacoes.item === 'string' ? { item: bruto.anotacoes.item.slice(0, 5000), faixas: {} } : undefined,
    },
  };
}

export const backupService = {
  /** RF016/RF094 – gera o objeto do backup completo da coleção. */
  async exportar() {
    if (!USE_MOCK) return http('/backup/exportar');
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    const usuario = db.usuarios.find((u) => u.id === meuId);
    return {
      formato: FORMATO,
      versao_formato: VERSAO_FORMATO,
      exportado_em: new Date().toISOString(),
      usuario: { nome: usuario.nome, apelido: usuario.apelido },
      itens: db.itens.filter((i) => i.id_usuario === meuId).map(itemParaArquivo),
    };
  },

  /** Lê e valida o arquivo. Devolve { itens, erros, exportado_em } SEM gravar nada (prévia). */
  analisarArquivo(texto) {
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      throw new ApiError('O arquivo não é um JSON válido', 422);
    }
    if (dados?.formato !== FORMATO) throw new ApiError('Este arquivo não é um backup da Radiola de Ficha', 422);
    if (dados.versao_formato > VERSAO_FORMATO) throw new ApiError('Backup feito numa versão mais nova do app. Atualize antes de importar.', 422);
    if (!Array.isArray(dados.itens)) throw new ApiError('Backup sem lista de itens', 422);
    if (dados.itens.length > 20000) throw new ApiError('Backup grande demais para importar pelo navegador', 413);

    const validos = [];
    const erros = [];
    let ignorados = 0;
    dados.itens.forEach((bruto, i) => {
      const r = validarItem(bruto, i);
      if (r.item) validos.push(r.item);
      else ignorados++;
      erros.push(...r.erros);
    });
    return { itens: validos, erros, ignorados, exportado_em: dados.exportado_em, usuario: dados.usuario };
  },

  /** RF095 – grava os itens validados. modo: 'mesclar' (pula duplicados) | 'substituir' (apaga e recria). */
  async importar(itens, modo = 'mesclar') {
    if (!USE_MOCK) return http('/backup/importar', { method: 'POST', body: { itens, modo } });
    await atraso(500);
    const db = mockDb.ler();
    const meuId = eu();
    const usuario = db.usuarios.find((u) => u.id === meuId);
    const limite = planoPorCodigo(usuario.plano).limite_itens;

    if (modo === 'substituir') db.itens = db.itens.filter((i) => i.id_usuario !== meuId);
    const meus = db.itens.filter((i) => i.id_usuario === meuId);
    // "Duplicado" = mesmo título + artista + formato
    const chave = (i) => `${i.titulo}|${i.artista}|${i.tipo_midia}`.toLowerCase();
    const existentes = new Set(meus.map(chave));

    let importados = 0;
    let pulados = 0;
    let barradosPeloLimite = 0;
    for (const item of itens) {
      if (existentes.has(chave(item))) {
        pulados++;
        continue;
      }
      if (limite && meus.length + importados >= limite) {
        barradosPeloLimite++;
        continue;
      }
      const id = mockDb.proximoId(db.itens);
      db.itens.push({
        ...item,
        id,
        id_usuario: meuId,
        data_cadastro: new Date().toISOString(),
        faixas: item.faixas.map((f, i) => ({ ...f, id: Date.now() + importados * 1000 + i })),
      });
      existentes.add(chave(item));
      importados++;
    }
    mockDb.salvar(db);
    return { importados, pulados, barradosPeloLimite };
  },

  /** Backups automáticos disponíveis para o plano (retenção de 7 ou 30 dias). */
  async disponiveis() {
    if (!USE_MOCK) return http('/backup/disponiveis');
    await atraso(200);
    const db = mockDb.ler();
    const meuId = eu();
    const usuario = db.usuarios.find((u) => u.id === meuId);
    const dias = planoPorCodigo(usuario.plano).backup_dias;
    const limite = Date.now() - dias * 86400000;
    return {
      retencao_dias: dias,
      backups: dias
        ? db.backups_registros
            .filter((b) => b.status === 'sucesso' && b.destino !== 'imutavel' && new Date(b.data_inicio).getTime() >= limite)
            .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio))
            .map(({ id, data_inicio }) => ({ id, data_inicio }))
        : [],
      solicitacoes: db.restauracoes_solicitacoes.filter((s) => s.id_usuario === meuId).sort((a, b) => b.id - a.id),
    };
  },

  async solicitarRestauracao(idBackup, observacoes) {
    if (!USE_MOCK) return http('/backup/restauracoes', { method: 'POST', body: { id_backup: idBackup, observacoes } });
    await atraso(300);
    const db = mockDb.ler();
    const meuId = eu();
    if (db.restauracoes_solicitacoes.some((s) => s.id_usuario === meuId && s.status === 'pendente')) {
      throw new ApiError('Você já tem uma restauração pendente. Aguarde a equipe concluir.', 409);
    }
    const solicitacao = {
      id: mockDb.proximoId(db.restauracoes_solicitacoes),
      id_usuario: meuId,
      id_backup: idBackup,
      tipo_restauracao: 'usuario_especifico',
      escopo: 'itens_colecao',
      data_solicitacao: new Date().toISOString(),
      status: 'pendente',
      observacoes,
    };
    db.restauracoes_solicitacoes.push(solicitacao);
    mockDb.salvar(db);
    return solicitacao;
  },
};

/** Dispara o download de um objeto como arquivo .json (Blob + link temporário). */
export function baixarJson(objeto, nomeArquivo) {
  const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
