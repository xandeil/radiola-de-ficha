/*
 * Dados de exemplo da Fase 3 (rede social).
 * Outros colecionadores, amizades, posts, grupos e as conquistas do documento.
 * Nomes de campos = colunas das tabelas do Anexo 1 (amizades, posts, grupos...).
 */

const hoje = Date.now();
const atras = (horas) => new Date(hoje - horas * 3600 * 1000).toISOString();

export const outrosUsuariosMock = [
  { id: 2, nome: 'Maria Souza', email: 'maria@radiola.com', senha: 'Demo@123', apelido: 'mariavinil', bio: 'Vinil desde os 15. Caço prensagem nacional dos anos 70 em feira.', plano: 'premium_anual', data_cadastro: '2026-03-02T10:00:00' },
  { id: 3, nome: 'João Lima', email: 'joao@radiola.com', senha: 'Demo@123', apelido: 'joaok7', bio: 'Mixtapes, fitas de rádio e um tape deck que já devia ter aposentado.', plano: 'gratuito', data_cadastro: '2026-05-11T10:00:00' },
  { id: 4, nome: 'Pedro Alves', email: 'pedro@radiola.com', senha: 'Demo@123', apelido: 'pedrocd', bio: 'CDs dos anos 90, de preferência com encarte completo.', plano: 'premium_mensal', data_cadastro: '2026-06-20T10:00:00' },
  { id: 5, nome: 'Ana Costa', email: 'ana@radiola.com', senha: 'Demo@123', apelido: 'anajazz', bio: 'Jazz, bossa e tudo que tem contrabaixo acústico.', plano: 'gratuito', data_cadastro: '2026-08-01T10:00:00' },
];

/** Gênero dos itens do usuário demo (o campo entrou na Fase 3, para as conquistas de diversidade). */
export const generosItensDemo = { 1: 'MPB', 2: 'Soul', 3: 'Rock', 4: 'Bossa Nova', 5: 'Pop', 6: 'Rap' };

const item = (id, id_usuario, titulo, artista, tipo_midia, ano_lancamento, genero, cor_capa, pais_origem = 'Brasil') => ({
  id, id_usuario, titulo, artista, tipo_midia, ano_lancamento, genero, cor_capa, pais_origem,
  publico: true,
  data_cadastro: '2026-09-01T10:00:00',
  localizacao: { local_principal: 'Sala' },
  faixas: [],
});

export const itensOutrosMock = [
  item(101, 2, 'Acabou Chorare', 'Novos Baianos', 'LP', 1972, 'MPB', '#c97b3a'),
  item(102, 2, 'Tropicália ou Panis et Circencis', 'Vários Artistas', 'LP', 1968, 'Tropicália', '#7a3a5c'),
  item(103, 2, 'Kind of Blue', 'Miles Davis', 'LP', 1959, 'Jazz', '#2f4f6f', 'EUA'),
  item(104, 2, 'Da Lama ao Caos', 'Chico Science & Nação Zumbi', 'CD', 1994, 'Manguebeat', '#4a3b2a'),
  item(105, 3, 'Fita do Baile 93', 'Vários Artistas', 'K7', null, 'Funk', '#a14d6b'),
  item(106, 3, 'Rádio Jornal — Anos 80', 'Vários Artistas', 'K7', 1987, 'Pop', '#5c7a4f'),
  item(107, 4, 'Afrociberdelia', 'Chico Science & Nação Zumbi', 'CD', 1996, 'Manguebeat', '#7a2e2e'),
  item(108, 4, 'Cabeça Dinossauro', 'Titãs', 'CD', 1986, 'Rock', '#9a8a2a'),
  item(109, 5, 'Getz/Gilberto', 'Stan Getz & João Gilberto', 'LP', 1964, 'Bossa Nova', '#2f5d62', 'EUA'),
];

export const amizadesMock = [
  { id: 1, id_usuario_1: 1, id_usuario_2: 2, status: 'ativa', data_solicitacao: atras(400) },
  { id: 2, id_usuario_1: 3, id_usuario_2: 1, status: 'pendente', data_solicitacao: atras(20) }, // João pediu ao demo
  { id: 3, id_usuario_1: 1, id_usuario_2: 4, status: 'pendente', data_solicitacao: atras(50) }, // demo pediu ao Pedro
  { id: 4, id_usuario_1: 2, id_usuario_2: 3, status: 'ativa', data_solicitacao: atras(300) },
];

export const postsMock = [
  { id: 1, id_usuario: 2, tipo_post: 'ouvindo', referencia: { titulo: 'Preta Pretinha', artista: 'Novos Baianos', formato: 'LP', cor_capa: '#c97b3a' }, conteudo_texto: 'Domingo de manhã pede isso.', visibilidade: 'amigos', data_publicacao: atras(3) },
  { id: 2, id_usuario: 2, tipo_post: 'recomendacao', id_destinatario: 1, referencia: { titulo: 'Da Lama ao Caos', artista: 'Chico Science & Nação Zumbi', formato: 'CD', cor_capa: '#4a3b2a' }, conteudo_texto: 'Você que é de Recife PRECISA ter esse na estante.', visibilidade: 'amigos', data_publicacao: atras(26) },
  { id: 3, id_usuario: 2, tipo_post: 'resenha', referencia: { titulo: 'Kind of Blue', artista: 'Miles Davis', formato: 'LP', cor_capa: '#2f4f6f' }, nota: 5, conteudo_texto: 'Prensagem antiga, chiado de leve no lado B, mas aquele "So What" abrindo continua imbatível. Disco para ouvir de luz apagada.', visibilidade: 'publico', data_publicacao: atras(72) },
  { id: 4, id_usuario: 4, tipo_post: 'texto', conteudo_texto: 'Alguém sabe limpar CD com risco leve sem piorar? Pasta de dente funciona mesmo?', visibilidade: 'publico', data_publicacao: atras(10) },
  { id: 5, id_usuario: 3, tipo_post: 'adicionou', referencia: { titulo: 'Rádio Jornal — Anos 80', artista: 'Vários Artistas', formato: 'K7', cor_capa: '#5c7a4f' }, visibilidade: 'publico', data_publicacao: atras(30) },
];

export const interacoesMock = [
  { id: 1, id_usuario: 3, id_post: 3, tipo: 'curtir', data_interacao: atras(60) },
  { id: 2, id_usuario: 1, id_post: 3, tipo: 'curtir', data_interacao: atras(50) },
  { id: 3, id_usuario: 3, id_post: 3, tipo: 'comentar', comentario_texto: 'Esse disco é obrigatório.', data_interacao: atras(59) },
  { id: 4, id_usuario: 3, id_post: 1, tipo: 'curtir', data_interacao: atras(2) },
];

export const gruposMock = [
  { id: 1, nome: 'Vinil Brasil', descricao: 'Prensagens nacionais, feiras, lojas e dicas de conservação.', categoria: 'formato', id_criador: 2, cor: '#b4462a', tipo: 'publico', data_criacao: atras(2000) },
  { id: 2, nome: 'MPB de Sempre', descricao: 'Clube do disco mensal: todo mês um álbum da MPB para ouvir e discutir.', categoria: 'genero', id_criador: 5, cor: '#3f6d7a', tipo: 'publico', data_criacao: atras(1500) },
  { id: 3, nome: 'Digitalizando K7', descricao: 'Tape decks, placas de captura e como salvar suas fitas antes que mofem.', categoria: 'formato', id_criador: 3, cor: '#a14d6b', tipo: 'publico', data_criacao: atras(900) },
  { id: 4, nome: 'Manguebeat', descricao: 'Chico Science, Nação Zumbi, mundo livre s/a e a cena de Recife.', categoria: 'genero', id_criador: 4, cor: '#4a3b2a', tipo: 'publico', data_criacao: atras(700) },
];

export const membrosGrupoMock = [
  { id_grupo: 1, id_usuario: 2, funcao: 'admin' },
  { id_grupo: 1, id_usuario: 1, funcao: 'membro' },
  { id_grupo: 1, id_usuario: 3, funcao: 'membro' },
  { id_grupo: 2, id_usuario: 5, funcao: 'admin' },
  { id_grupo: 2, id_usuario: 2, funcao: 'membro' },
  { id_grupo: 3, id_usuario: 3, funcao: 'admin' },
  { id_grupo: 4, id_usuario: 4, funcao: 'admin' },
  { id_grupo: 4, id_usuario: 2, funcao: 'membro' },
];

export const postsGrupoMock = [
  { id: 1, id_grupo: 1, id_usuario: 2, titulo: 'Feira do Recife Antigo — domingo', conteudo: 'Vai ter banca nova com muita coisa da Continental. Quem anima?', data_publicacao: atras(12) },
  { id: 2, id_grupo: 1, id_usuario: 3, titulo: 'Qual escova vocês usam?', conteudo: 'Fibra de carbono ou veludo? A minha está soltando pelo.', data_publicacao: atras(40) },
  { id: 3, id_grupo: 2, id_usuario: 5, titulo: 'Disco de outubro: Clube da Esquina', conteudo: 'Ouçam até o dia 30 e tragam a faixa favorita. A minha é "Cais".', data_publicacao: atras(100) },
  { id: 4, id_grupo: 3, id_usuario: 3, titulo: 'Azimute do cabeçote', conteudo: 'Se a fita está abafada, antes de culpar a fita, confere o azimute.', data_publicacao: atras(200) },
];

/*
 * Conquistas (RF078–RF080), copiadas dos INSERTs do documento.
 * "criterios" diz o que contar; o conquistaService interpreta.
 */
export const conquistasMock = [
  { id: 1, nome: 'Primeiro Item', descricao: 'Catalogou seu primeiro item', categoria: 'catalogo', criterios: { itens: 1 }, pontos: 5, cor: '#d9a441' },
  { id: 2, nome: 'Colecionador Iniciante', descricao: 'Atingiu 50 itens', categoria: 'catalogo', criterios: { itens: 50 }, pontos: 10, cor: '#c97b3a' },
  { id: 3, nome: 'Colecionador Experiente', descricao: 'Atingiu 200 itens', categoria: 'catalogo', criterios: { itens: 200 }, pontos: 20, cor: '#b4462a' },
  { id: 4, nome: 'Colecionador Master', descricao: 'Atingiu 500 itens', categoria: 'catalogo', criterios: { itens: 500 }, pontos: 50, cor: '#7a3a5c' },
  { id: 5, nome: 'Colecionador Lendário', descricao: 'Atingiu 1000 itens', categoria: 'catalogo', criterios: { itens: 1000 }, pontos: 100, cor: '#2a211b' },
  { id: 6, nome: 'Vinilmaníaco', descricao: 'Possui 100 LPs', categoria: 'catalogo', criterios: { tipo: 'LP', quantidade: 100 }, pontos: 30, cor: '#1a1512' },
  { id: 7, nome: 'Cassetemaníaco', descricao: 'Possui 50 K7', categoria: 'catalogo', criterios: { tipo: 'K7', quantidade: 50 }, pontos: 30, cor: '#a14d6b' },
  { id: 8, nome: 'Ecletismo', descricao: 'Possui itens de 10 gêneros diferentes', categoria: 'diversidade', criterios: { generos: 10 }, pontos: 15, cor: '#5c7a4f' },
  { id: 9, nome: 'Explorador', descricao: 'Possui itens de 20 países diferentes', categoria: 'diversidade', criterios: { paises: 20 }, pontos: 20, cor: '#3f6d7a' },
  { id: 10, nome: 'Retrô', descricao: 'Possui itens de 5 décadas diferentes', categoria: 'diversidade', criterios: { decadas: 5 }, pontos: 15, cor: '#a8741a' },
  { id: 11, nome: 'Multiformato', descricao: 'Possui LP, CD e K7', categoria: 'diversidade', criterios: { formatos: ['LP', 'CD', 'K7'] }, pontos: 25, cor: '#2f5d62' },
  { id: 12, nome: 'Social', descricao: 'Convidou 5 amigos', categoria: 'social', criterios: { convites: 5 }, pontos: 10, cor: '#c9a227' },
  { id: 13, nome: 'Influenciador', descricao: 'Recebeu 100 curtidas em resenhas', categoria: 'social', criterios: { curtidas_recebidas: 100 }, pontos: 25, cor: '#e0694a' },
  { id: 14, nome: 'Crítico', descricao: 'Escreveu 20 resenhas', categoria: 'social', criterios: { resenhas: 20 }, pontos: 20, cor: '#6b5a3a' },
];

export const niveisMock = [
  { nivel: 1, nome: 'Iniciante', pontos_minimos: 0, pontos_maximos: 49 },
  { nivel: 2, nome: 'Aprendiz', pontos_minimos: 50, pontos_maximos: 199 },
  { nivel: 3, nome: 'Colecionador', pontos_minimos: 200, pontos_maximos: 499 },
  { nivel: 4, nome: 'Expert', pontos_minimos: 500, pontos_maximos: 999 },
  { nivel: 5, nome: 'Mestre', pontos_minimos: 1000, pontos_maximos: 1999 },
  { nivel: 6, nome: 'Lenda', pontos_minimos: 2000, pontos_maximos: 999999 },
];
