/*
 * Dados da Fase 5: equipe, papéis e permissões (seção 10), base de
 * conhecimento e tickets (9.5), backups (seção 7), manutenção (Anexo 2)
 * e automações de marketing (9.4).
 */

const agora = Date.now();
const atras = (horas) => new Date(agora - horas * 3600 * 1000).toISOString();
const diaISO = (n) => new Date(agora + n * 86400000).toISOString().slice(0, 10);

/** Membros da equipe. "equipe: true" os tira da busca de pessoas da rede social. */
export const equipeMock = [
  { id: 90, nome: 'Admin Radiola', email: 'admin@radiola.com', senha: 'Demo@123', apelido: 'admin', bio: '', plano: 'gratuito', equipe: true, data_cadastro: '2026-01-01T10:00:00' },
  { id: 91, nome: 'Bia do Suporte', email: 'suporte@radiola.com', senha: 'Demo@123', apelido: 'biasuporte', bio: '', plano: 'gratuito', equipe: true, data_cadastro: '2026-02-01T10:00:00' },
  { id: 92, nome: 'Caio Financeiro', email: 'financeiro@radiola.com', senha: 'Demo@123', apelido: 'caiofin', bio: '', plano: 'gratuito', equipe: true, data_cadastro: '2026-02-15T10:00:00' },
];

/*
 * RBAC (Role-Based Access Control): o usuário tem PAPÉIS, o papel tem
 * PERMISSÕES. As telas nunca perguntam "é admin?"; perguntam
 * "tem a permissão tickets.responder?". Criar um papel novo não exige
 * mexer em nenhuma tela. Nível = hierarquia (quem pode atribuir papel a quem).
 */
export const papeisMock = [
  { id: 1, nome: 'superadmin', rotulo: 'Superusuário', nivel: 100, permissoes: ['*'] },
  { id: 2, nome: 'admin', rotulo: 'Administrador', nivel: 80, permissoes: ['admin.acessar', 'dashboard.ver', 'usuarios.ver', 'usuarios.editar', 'tickets.ver', 'tickets.responder', 'crm.ver', 'crm.executar', 'assinaturas.ver', 'backup.ver', 'logs.ver', 'sistema.acessar_manutencao'] },
  { id: 3, nome: 'moderador', rotulo: 'Moderador', nivel: 60, permissoes: ['admin.acessar', 'dashboard.ver', 'usuarios.ver'] },
  { id: 4, nome: 'suporte', rotulo: 'Suporte', nivel: 50, permissoes: ['admin.acessar', 'dashboard.ver', 'usuarios.ver', 'tickets.ver', 'tickets.responder'] },
  { id: 5, nome: 'financeiro', rotulo: 'Financeiro', nivel: 40, permissoes: ['admin.acessar', 'dashboard.ver', 'assinaturas.ver', 'assinaturas.reembolsar'] },
  { id: 6, nome: 'editorial', rotulo: 'Editorial', nivel: 30, permissoes: ['admin.acessar', 'dashboard.ver', 'crm.ver'] },
  { id: 7, nome: 'usuario', rotulo: 'Usuário', nivel: 10, permissoes: [] },
];

export const usuariosPapeisMock = [
  { id_usuario: 90, id_papel: 1 },
  { id_usuario: 91, id_papel: 4 },
  { id_usuario: 92, id_papel: 5 },
];

export const artigosAjudaMock = [
  { id: 1, slug: 'como-escanear', titulo: 'Como cadastrar um disco pelo código de barras', categoria: 'Catálogo', conteudo: 'Abra o menu Escanear e permita o uso da câmera. Enquadre o código no retângulo. Se a câmera não ajudar, use a aba Foto ou digite o código. Discos antigos, sem código, podem ser buscados pela aba Sem código, com título e artista.', tags: ['scanner', 'código de barras', 'cadastro'], views: 312, util_sim: 41, util_nao: 3 },
  { id: 2, slug: 'vitrola-sem-som', titulo: 'A vitrola gira mas não sai som', categoria: 'Player', conteudo: 'Sem arquivo de áudio vinculado, a vitrola roda em modo demonstração. Vincule um MP3 ou FLAC digitalizado pelo ícone ♪ da faixa, ou conecte o Spotify em Configurações para tocar pelo streaming. A reprodução do Spotify no navegador exige conta Premium.', tags: ['áudio', 'spotify', 'player'], views: 520, util_sim: 77, util_nao: 9 },
  { id: 3, slug: 'cancelar-assinatura', titulo: 'Como cancelar ou mudar meu plano', categoria: 'Assinatura', conteudo: 'Vá em Minha assinatura. Para mudar de plano, escolha Ver planos. No upgrade, os dias restantes viram crédito; no downgrade, a troca acontece no fim do período. Ao cancelar, você continua Premium até o fim do período pago.', tags: ['cancelar', 'plano', 'reembolso'], views: 198, util_sim: 22, util_nao: 4 },
  { id: 4, slug: 'pix-nao-confirmou', titulo: 'Paguei o Pix e a assinatura não ativou', categoria: 'Assinatura', conteudo: 'A confirmação do Pix costuma levar segundos, mas pode demorar até 30 minutos em horários de pico. A tela do pagamento atualiza sozinha. Se passar disso, abra um ticket na categoria Financeiro com o comprovante.', tags: ['pix', 'pagamento'], views: 143, util_sim: 18, util_nao: 6 },
  { id: 5, slug: 'backup', titulo: 'Como fazer backup e restaurar minha coleção', categoria: 'Conta', conteudo: 'Em Configurações > Backup, baixe o arquivo completo da sua coleção (JSON) a qualquer momento. Assinantes têm backup automático diário (7 ou 30 dias de retenção) e podem pedir a restauração de uma data específica.', tags: ['backup', 'restaurar', 'exportar'], views: 87, util_sim: 12, util_nao: 1 },
  { id: 6, slug: 'privacidade', titulo: 'Quem vê minha estante e minhas publicações?', categoria: 'Social', conteudo: 'Só os itens marcados como "Mostrar na estante pública" aparecem no seu perfil. Cada publicação tem visibilidade própria: Público, Amigos ou Só eu. Você pode bloquear qualquer pessoa pelo perfil dela.', tags: ['privacidade', 'perfil', 'bloquear'], views: 154, util_sim: 30, util_nao: 2 },
];

export const ticketsMock = [
  { id: 1, id_usuario: 3, categoria: 'problema_tecnico', assunto: 'Minha fita não toca no Gravador de Rolo', descricao: 'Escolho o perfil e aparece um cadeado.', prioridade: 'media', status: 'respondido', data_abertura: atras(30), data_atualizacao: atras(26), id_agente: 91 },
  { id: 2, id_usuario: 4, categoria: 'financeiro', assunto: 'Cobrança duplicada no cartão?', descricao: 'Apareceram duas cobranças de R$ 14,90 na fatura.', prioridade: 'alta', status: 'aberto', data_abertura: atras(5), data_atualizacao: atras(5), id_agente: null },
  { id: 3, id_usuario: 2, categoria: 'sugestao', assunto: 'Campo para matriz/runout no vinil', descricao: 'Seria ótimo registrar o que está gravado no runout do disco.', prioridade: 'baixa', status: 'aberto', data_abertura: atras(52), data_atualizacao: atras(52), id_agente: null },
];

export const respostasMock = [
  { id: 1, id_ticket: 1, id_usuario: 91, mensagem: 'Oi João! O Gravador de Rolo é um perfil da Radiola Completa. Você pode testar grátis por 7 dias pelo botão do próprio cadeado.', data_resposta: atras(26) },
];

/** Backups dos últimos dias (seção 7.3/7.4): diário completo + um imutável mensal. */
export function gerarBackupsMock() {
  const lista = [];
  for (let d = 1; d <= 14; d++) {
    const inicio = new Date(agora - d * 86400000);
    inicio.setUTCHours(6, 0, 0, 0);
    lista.push({
      id: lista.length + 1,
      tipo_backup: 'completo',
      data_inicio: inicio.toISOString(),
      data_fim: new Date(inicio.getTime() + (180 + d * 7) * 1000).toISOString(),
      tamanho_bytes: 48_000_000 + d * 210_000,
      arquivo_nome: `radiola_${inicio.toISOString().slice(0, 10)}.sql.gz.enc`,
      checksum: Array.from({ length: 64 }, (_, i) => '0123456789abcdef'[(d * 7 + i * 13) % 16]).join(''),
      destino: 'nuvem',
      status: d === 9 ? 'falha' : 'sucesso',
      log_erro: d === 9 ? 'Timeout ao enviar para o storage (tentativa 3/3)' : null,
      data_expiracao: diaISO(30 - d),
    });
  }
  lista.push({ id: lista.length + 1, tipo_backup: 'completo', data_inicio: atras(24 * 19), data_fim: atras(24 * 19 - 0.1), tamanho_bytes: 47_100_000, arquivo_nome: 'radiola_mensal_imutavel.sql.gz.enc', checksum: 'f'.repeat(64), destino: 'imutavel', status: 'sucesso', data_expiracao: diaISO(345) });
  return lista;
}

export const manutencaoPadrao = {
  ativo: false,
  tipo_manutencao: 'programada',
  data_inicio: null,
  data_fim: null,
  motivo_publico: 'Manutenção programada para melhorias',
  descricao_tecnica: '',
  titulo_personalizado: 'Radiola em Manutenção',
  mensagem_personalizada: 'Estamos ajustando os botões da vitrola para você ter a melhor experiência possível. Volte em breve!',
  allow_ips: [],
  historico: [],
};

/** Seção 9.4 – automações de marketing (CRM). */
export const automacoesMock = [
  { id: 'onboarding', nome: 'Onboarding', segmento: 'novos', descricao: 'Sequência de boas-vindas nos primeiros 7 dias', assunto: 'Bem-vindo à Radiola! Cadastre seu primeiro disco', ativa: true },
  { id: 'reengajamento', nome: 'Reengajamento', segmento: 'inativos', descricao: 'E-mails aos 30, 37 e 45 dias sem login', assunto: 'Sua vitrola está com saudade 🎶', ativa: true },
  { id: 'upgrade', nome: 'Convite ao upgrade', segmento: 'limite', descricao: 'Quando o gratuito passa de 80% do limite de itens', assunto: 'Sua estante está quase cheia', ativa: true },
  { id: 'retencao', nome: 'Retenção', segmento: 'risco', descricao: 'Assinatura cancelada ou teste acabando', assunto: 'Antes de você ir: 50% de desconto', ativa: false },
  { id: 'beta', nome: 'Convite beta tester', segmento: 'power', descricao: 'Usuários com mais de 100 itens', assunto: 'Quer testar as novidades antes de todo mundo?', ativa: false },
];
