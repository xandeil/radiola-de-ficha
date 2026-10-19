/*
 * Dados da Fase 4: planos (RF046–RF050), cupons (RF055), assinaturas de
 * exemplo, campanhas de publicidade (seção 8) e programas de afiliados (8.3).
 * Preços e recursos copiados do Apêndice do documento.
 */

export const planosMock = [
  {
    id: 1,
    codigo: 'gratuito',
    nome: 'Radiola Básica',
    descricao: 'Para começar a organizar sua coleção',
    preco_mensal: 0,
    preco_anual: 0,
    limite_itens: 50,
    propagandas: true,
    backup_dias: 0,
    recursos: { player: 'basico', perfis: 1, encarte: 'basico', scanner: false, exportacao: false },
    destaques: ['Até 50 itens no catálogo', 'Player Vitrola Clássica', 'Busca automática de capas', 'Encarte com dados básicos', 'Com propagandas discretas'],
  },
  {
    id: 2,
    codigo: 'premium_mensal',
    nome: 'Radiola Completa',
    descricao: 'Tudo que um colecionador precisa',
    preco_mensal: 14.9,
    preco_anual: null,
    limite_itens: null,
    propagandas: false,
    backup_dias: 7,
    recursos: { player: 'completo', perfis: 5, encarte: 'completo', scanner: true, exportacao: true },
    destaques: ['Catálogo ilimitado', 'Todos os perfis: Rádio, Jukebox, Gravador', 'Scanner de código de barras', 'Sem propagandas', 'Backup automático (7 dias)', 'Suporte por e-mail em até 48h'],
  },
  {
    id: 3,
    codigo: 'premium_anual',
    nome: 'Radiola Completa Anual',
    descricao: 'O melhor custo-benefício',
    preco_mensal: null,
    preco_anual: 149,
    limite_itens: null,
    propagandas: false,
    backup_dias: 30,
    recursos: { player: 'completo', perfis: 5, encarte: 'completo', scanner: true, exportacao: true, selo_anual: true },
    destaques: ['Tudo do Completa', '2 meses grátis', 'Backup estendido (30 dias)', 'Selo "Assinante Anual" no perfil', 'Relatório anual da coleção'],
  },
  {
    id: 4,
    codigo: 'familia',
    nome: 'Radiola Família',
    descricao: 'Para toda a família de colecionadores',
    preco_mensal: null,
    preco_anual: 298,
    limite_itens: null,
    propagandas: false,
    backup_dias: 30,
    max_membros: 5,
    recursos: { player: 'completo', perfis: 5, encarte: 'completo', scanner: true, exportacao: true, usuarios: 5 },
    destaques: ['Tudo do Anual para até 5 pessoas', 'Catálogo compartilhado ou separado', 'Gerenciado pelo titular'],
  },
  {
    id: 5,
    codigo: 'estudante',
    nome: 'Radiola Universitária',
    descricao: 'Para estudantes, com 50% de desconto',
    preco_mensal: 7.45,
    preco_anual: null,
    limite_itens: null,
    propagandas: false,
    backup_dias: 7,
    exige_comprovante: true,
    limite_meses: 48,
    recursos: { player: 'completo', perfis: 5, encarte: 'completo', scanner: true, exportacao: true },
    destaques: ['Tudo do Completa pela metade', 'Comprovante de matrícula por ano', 'Até 48 meses de uso'],
  },
];

const hoje = new Date();
const dia = (n) => new Date(hoje.getTime() + n * 86400000).toISOString().slice(0, 10);

export const cuponsMock = [
  { id: 1, codigo: 'RADIOLA10', descricao: '10% de desconto', tipo_desconto: 'percentual', valor_desconto: 10, plano_aplicavel: null, data_inicio: dia(-30), data_fim: dia(60), uso_maximo: 1000, usos_atual: 12, ativo: true },
  { id: 2, codigo: 'BEMVINDO', descricao: 'R$ 5 de desconto na primeira cobrança', tipo_desconto: 'fixo', valor_desconto: 5, plano_aplicavel: 2, data_inicio: dia(-30), data_fim: dia(90), uso_maximo: null, usos_atual: 0, ativo: true },
  { id: 3, codigo: 'FEIRA2025', descricao: 'Promoção da feira (encerrada)', tipo_desconto: 'percentual', valor_desconto: 30, plano_aplicavel: null, data_inicio: '2025-01-01', data_fim: '2025-12-31', uso_maximo: 100, usos_atual: 100, ativo: true },
  { id: 4, codigo: 'VOLTA50', descricao: 'Oferta de retenção: 50% no próximo ciclo', tipo_desconto: 'percentual', valor_desconto: 50, plano_aplicavel: null, data_inicio: dia(-365), data_fim: dia(365), uso_maximo: null, usos_atual: 0, ativo: true, interno: true },
];

export const assinaturasMock = [
  { id: 1, id_usuario: 2, id_plano: 3, status: 'ativa', data_inicio: dia(-120), data_expiracao: dia(245), proxima_cobranca: dia(245), metodo_pagamento: 'cartao', cartao: { bandeira: 'visa', ultimos4: '4242' } },
  { id: 2, id_usuario: 4, id_plano: 2, status: 'ativa', data_inicio: dia(-20), data_expiracao: dia(10), proxima_cobranca: dia(10), metodo_pagamento: 'pix' },
];

/*
 * Campanhas fictícias (marcas inventadas). "segmentacao_json.generos" permite
 * a segmentação contextual da seção 8.2: o anúncio combina com o gênero que
 * o usuário está vendo.
 */
export const campanhasMock = [
  { id: 1, nome: 'Sebo Rotação 33', id_anunciante: 1, formato: 'banner', conteudo_json: { titulo: 'Sebo Rotação 33', texto: 'Vinis usados revisados, com garantia de 30 dias. Centro do Recife.', cta: 'Ver acervo', cor: '#3f6d7a' }, url_destino: 'https://example.com/rotacao33', segmentacao_json: { generos: ['MPB', 'Bossa Nova', 'Samba'] }, status: 'ativa' },
  { id: 2, nome: 'Limpa-Disco Pro', id_anunciante: 2, formato: 'banner', conteudo_json: { titulo: 'Limpa-Disco Pro', texto: 'Solução antiestática para vinil. Menos chiado, mais música.', cta: 'Conhecer', cor: '#5c7a4f' }, url_destino: 'https://example.com/limpadisco', segmentacao_json: {}, status: 'ativa' },
  { id: 3, nome: 'Toca-Fitas Restaurações', id_anunciante: 3, formato: 'card', conteudo_json: { titulo: 'Seu tape deck parou?', texto: 'Troca de correias, limpeza de cabeçote e azimute. Orçamento grátis.', cta: 'Pedir orçamento', cor: '#a14d6b' }, url_destino: 'https://example.com/tocafitas', segmentacao_json: { formatos: ['K7'] }, status: 'ativa' },
  { id: 4, nome: 'Feira do Vinil', id_anunciante: 4, formato: 'card', conteudo_json: { titulo: 'Feira do Vinil — domingo', texto: '40 expositores, discos a partir de R$ 10. Entrada franca.', cta: 'Ver programação', cor: '#b4462a' }, url_destino: 'https://example.com/feira', segmentacao_json: {}, status: 'ativa' },
  { id: 5, nome: 'Agulhas Diamante Sul', id_anunciante: 5, formato: 'post_nativo', conteudo_json: { titulo: 'Sua agulha tem mais de 1.000 horas?', texto: 'Agulha gasta risca o disco. Confira modelos compatíveis com seu toca-discos.', cta: 'Encontrar minha agulha', cor: '#6b5a3a' }, url_destino: 'https://example.com/agulhas', segmentacao_json: {}, status: 'ativa' },
  { id: 6, nome: 'Rádio Frevo FM', id_anunciante: 6, formato: 'vinheta', conteudo_json: { titulo: 'Rádio Frevo FM', texto: 'Esta sessão da Radiola é oferecida pela Rádio Frevo FM — a trilha do seu carnaval o ano inteiro.', cta: 'Ouvir ao vivo', cor: '#c9a227' }, url_destino: 'https://example.com/frevofm', segmentacao_json: {}, status: 'ativa' },
  { id: 7, nome: 'Estúdio Capta K7', id_anunciante: 7, formato: 'intersticial', conteudo_json: { titulo: 'Suas fitas estão mofando?', texto: 'Digitalizamos K7, rolo e vinil em alta qualidade. Entregamos em FLAC e MP3.', cta: 'Saber mais', cor: '#2f5d62' }, url_destino: 'https://example.com/captak7', segmentacao_json: {}, status: 'ativa' },
];

/* Seção 8.3 – parâmetros iguais aos do INSERT de programas_afiliados do documento. */
export const programasAfiliadosMock = [
  { id: 1, parceiro: 'mercadolivre', nome: 'Mercado Livre', taxa_comissao: 4, parametro_url: 'afiliado=radiola_ml' },
  { id: 2, parceiro: 'amazon', nome: 'Amazon', taxa_comissao: 5, parametro_url: 'tag=radiola-20' },
  { id: 3, parceiro: 'discogs', nome: 'Discogs', taxa_comissao: 2, parametro_url: 'affiliate_id=radiola-discogs' },
];
