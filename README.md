# 📀 Radiola de Ficha — Front-end

Catálogo de mídia física (LP, CD, DVD e fita K7) com player em formato de vitrola retrô.
Este repositório é o **front-end em React + JavaScript**, cobrindo as **Fases 0, 1, 2, 3, 3.5 e 4** da documentação do projeto.

> Funciona sozinho, sem back-end: os dados ficam num "banco" falso salvo no `localStorage` do navegador.
> Quando a API em PHP existir, basta mudar uma variável de ambiente.

## Como rodar

Requisitos: **Node.js 18+**.

```bash
npm install
npm run dev
```

Abra http://localhost:5173 e entre com:

- **E-mail:** `demo@radiola.com`
- **Senha:** `Demo@123`

Outros colecionadores de exemplo (mesma senha `Demo@123`): `maria@radiola.com` (amiga do demo),
`joao@radiola.com` (pediu amizade ao demo), `pedro@radiola.com` e `ana@radiola.com`.
Entre com eles para ver a rede social pelo outro lado.

Cada conta de teste, inclusive as da equipe, tem **10 discos em 4 armários diferentes**, com prateleira e posição
(`src/mocks/catalogos.js`).

Para testar no **celular** (câmera do scanner): `npm run dev:celular` e abra no celular o endereço `https://IP-DO-PC:5173`
que aparece no terminal (aceite o aviso de certificado — ele é autoassinado e só serve para desenvolvimento).
O navegador só libera a câmera em HTTPS ou localhost.

Outros comandos: `npm run build` (gera a pasta `dist/` para produção) e `npm run preview` (testa o build).

## O que já está pronto (Fase 0 + Fase 1)

| Requisito | Onde |
|---|---|
| Login, cadastro com senha forte (RNF022), recuperar senha, rotas protegidas (RNF021) | `pages/auth/`, `routes/Guardas.jsx` |
| Dashboard com números da coleção e limite do plano gratuito (RF046) | `pages/dashboard/` |
| Catálogo em fichas ou lista, busca, filtros por formato/local, ordenação (RF013) | `pages/catalogo/CatalogoPage.jsx` |
| Cadastro e edição de LP, CD, DVD e K7 com campos específicos de cada formato (RF001, RF004, RF007, RF009) | `pages/catalogo/ItemFormularioPage.jsx` |
| Faixas: adicionar, reordenar, remover, lado A/B para vinil e fita (RF002, RF005, RF010) | `components/catalogo/EditorFaixas.jsx` |
| Localização física com data da última movimentação (RF003, RF006, RF011) | `components/catalogo/CamposLocalizacao.jsx` |
| Duplicação rápida de item (RF018) | botão "Duplicar" na ficha |
| Exportação CSV (RF016) | `utils/exportarCsv.js` |
| Player com fila, aleatório, repetir, volume e progresso (RF019, RF025, RF026) | `contexts/PlayerContext.jsx` |
| Vitrola animada com aceleração/frenagem, braço que acompanha a música, gestos de toque e tela cheia (RF027–RF032) | `components/player/Vitrola.jsx`, `pages/player/` |
| Tema claro/escuro automático (RNF019), responsivo (RNF014), acessibilidade básica (RNF015) | `styles/global.css` |

## Fase 2 — Streaming e Encarte

| Requisito | Onde |
|---|---|
| Conexão com a conta Spotify do usuário (OAuth 2.0 + PKCE) (RF021) | `services/streaming/spotifyAuth.js`, `pages/configuracoes/` |
| Busca unificada: coleção + Spotify ao mesmo tempo (RF022) | `pages/busca/BuscaPage.jsx` |
| Fila mista com faixas do acervo e do Spotify | `contexts/PlayerContext.jsx` |
| Fallback automático: faixa sem arquivo toca pelo Spotify (RF024) | `contexts/PlayerContext.jsx` |
| Reprodução no navegador via Web Playback SDK (exige Premium) | `services/streaming/spotifyPlayer.js` |
| Encarte digital com abas Artista / Álbum / Faixa, conteúdo da Wikipédia e cache de 7 dias (RF038–RF040, RNF007) | `components/encarte/`, `services/encarteService.js` |
| "Não é esse?": escolher a página certa da Wikipédia (RF042) | `components/encarte/EncartePainel.jsx` |
| Anotações pessoais por disco e por faixa (RF041) | aba "Minhas notas" do encarte |
| Perfil "Rádio de Válvulas" e troca de perfil (RF035, RF036) | `components/player/RadioValvulas.jsx` |

### Ligando o Spotify de verdade

Sem configuração nenhuma, o app usa um **Spotify de demonstração** (catálogo falso, sem som) para você ver tudo funcionando.
Para usar a sua conta:

1. Entre em https://developer.spotify.com/dashboard e crie um app (marque **Web API** e **Web Playback SDK**).
2. Em *Redirect URIs*, cadastre `http://127.0.0.1:5173/callback/spotify` — o Spotify **não aceita** `localhost`.
3. Copie o *Client ID* para o `.env`: `VITE_SPOTIFY_CLIENT_ID=seu_client_id`.
4. Rode `npm run dev` e abra **http://127.0.0.1:5173** (não `localhost`).
5. Vá em **Configurações → Conectar**.

Contas **Free** conseguem buscar, mas só **Premium** toca dentro do navegador; para Free, a vitrola oferece "Abrir no Spotify".
Apps novos no Spotify ficam em *Development mode*: só as contas que você adicionar em *User Management* conseguem conectar.

> ⚠️ Nesta fase o token do Spotify fica no `localStorage` para funcionar sem servidor. Em produção, a troca do código
> pelo token deve ir para o back-end PHP com o token criptografado no banco (RNF031, tabela `tokens_streaming`).

## Fase 3 — Rede social e gamificação

| Requisito | Onde |
|---|---|
| Perfil público `/perfil/:apelido` com estante pública, números e selos (RF057) | `pages/social/PerfilPage.jsx` |
| Editar nome, apelido e bio | Configurações → Perfil público |
| Amizades: pedir, aceitar, recusar, desfazer, bloquear; busca de pessoas; convite por link (RF058–RF061) | `pages/social/AmigosPage.jsx`, `components/social/BotaoAmizade.jsx` |
| Feed com texto, "ouvindo agora", resenha com nota, recomendação para um amigo (RF062–RF064, RF068) | `pages/social/FeedPage.jsx`, `components/social/NovoPost.jsx` |
| Curtir e comentar (RF067), com visibilidade Público / Amigos / Só eu | `components/social/CartaoPost.jsx` |
| "Compartilhar o que estou ouvindo" direto do player (RF062) | botão na página da Vitrola |
| Atividade automática: "adicionou à coleção" e "desbloqueou uma conquista" | `catalogoService`, `conquistaService` |
| Grupos por gênero e formato: entrar, sair, criar, tópicos (RF073–RF076) | `pages/social/GruposPage.jsx`, `GrupoPage.jsx` |
| Conquistas, selos, pontos e nível de colecionador (RF078–RF082) | `services/conquistaService.js`, `pages/social/ConquistasPage.jsx` |
| Perfil "Jukebox" com fichas de seleção A1, A2... (RF036) | `components/player/Jukebox.jsx` |
| Campo **gênero** no item (necessário para a conquista "Ecletismo") | formulário do catálogo |

**Privacidade no mock:** item de outra pessoa só aparece se for público; post "Amigos" só para amigos;
quem foi bloqueado não vê o perfil. O mock segue as mesmas regras que a API PHP precisa seguir.

**Banco mock com migração:** quem já usava a Fase 1 ou 2 não perde os itens cadastrados — o `mockDb.js`
converte o banco antigo para o formato novo (versão 2) na primeira vez que o app abre.

## Fase 3.5 — Scanner e fitas K7

| Requisito | Onde |
|---|---|
| Escanear pela câmera, com mira, lanterna, bipe e vibração (RF012, seção 6.2.1) | `components/scanner/LeitorCamera.jsx` |
| Ler o código de uma foto ou digitá-lo | `pages/scanner/ScannerPage.jsx` |
| Validação de EAN-13, UPC e ISBN pelo dígito verificador (6.2.2) | `utils/codigoBarras.js` |
| Busca no MusicBrainz + capa do Cover Art Archive (6.2.3) | `services/scannerService.js` |
| Lista de edições para escolher a certa (6.2.4) | tela de resultado do scanner |
| Cache de 30 dias (6.2.5) e log de escaneamentos (`log_escaneamentos`) | `services/scannerService.js` |
| Disco sem código: busca por título + artista (6.2.6) | aba "Sem código" |
| Aviso de item já cadastrado com o mesmo código | tela de resultado |
| Cadastro pré-preenchido (faixas, lados A/B, duração, gravadora, país) | `ItemFormularioPage` recebe pelo `state` da navegação |
| Medidor de tempo por lado da fita e alerta quando as faixas não cabem | `components/catalogo/PainelFita.jsx` |
| Marcar fita como digitalizada e filtrar digitalizadas | ficha da K7 e filtros do catálogo |
| Perfil "Gravador de Rolo": carretéis com física real, contador e VU meters | `components/player/GravadorRolo.jsx` |

**Como a leitura funciona:** se o navegador tem o `BarcodeDetector` nativo (Chrome/Edge no Android), ele é usado.
Senão, a biblioteca **ZXing** é baixada sob demanda (`import()` dinâmico) — quem não precisa dela nem a carrega.

**Códigos de demonstração** (funcionam offline): `7891234567895` (duas edições, LP e CD) e `4006381333931` (uma K7).
Qualquer outro código é buscado no MusicBrainz de verdade.

**Por que não o Discogs no front?** A API do Discogs exige um token; no navegador ele ficaria visível para qualquer um.
Com `VITE_USE_MOCK=false`, o scanner chama `GET /scanner/:codigo` e o PHP consulta Discogs e MusicBrainz com segurança.

## Fase 4 — Planos, pagamentos e publicidade

| Requisito | Onde |
|---|---|
| 5 planos com preços e recursos do documento + tabela comparativa (RF046–RF050) | `pages/assinatura/PlanosPage.jsx`, `mocks/assinatura.js` |
| Teste grátis de 7 dias, uma vez por conta (RF054) | botão "Testar 7 dias grátis" |
| Checkout com cartão, Pix (QR Code) e boleto via Mercado Pago (11.3) | `pages/assinatura/CheckoutPage.jsx` |
| Cupons com validade, limite de uso e plano específico (RF055) | `RADIOLA10`, `BEMVINDO`, `FEIRA2025` (expirado) |
| Upgrade com crédito proporcional; downgrade agendado para o fim do período (RF052) | `assinaturaService.cotacao` |
| Painel da assinatura, histórico de pagamentos (RF051) | `pages/assinatura/MinhaAssinaturaPage.jsx` |
| Cancelamento com motivo e oferta de retenção de 50% (RF053, seção 9.4) | fluxo em 3 passos no painel |
| Plano Família: convidar até 4 pessoas (RF049) · Universitário: comprovante (RF050) | painel / checkout |
| Avisos: fim do teste, pagamento pendente/recusado, cancelada (RF056) | `components/assinatura/AvisosAssinatura.jsx` |
| Recursos Premium bloqueados com convite: scanner, perfis do player (RF046/RF047) | `contexts/PlanoContext.jsx`, `RecursoPremium.jsx` |
| Selo "Assinante Anual" no perfil (RF048) | perfil público |
| Propagandas do gratuito: banner, card no catálogo, post no feed, vinheta e intervalo a cada 5 músicas (8.1) | `components/publicidade/` |
| Limite de frequência, segmentação por contexto, impressões e cliques (8.1, 8.2) | `services/publicidadeService.js` |
| Links de afiliado com aviso de comissão (8.3) | `components/publicidade/OndeComprar.jsx` |

**Testando pagamentos (modo demonstração):**

- Cartão: `5031 4332 1540 6351`, validade futura (ex.: `11/30`), CVV `123`, CPF válido (ex.: `529.982.247-25`).
- O **nome do titular** decide o resultado, igual aos cartões de teste do Mercado Pago: `APRO` aprova, `OTHE` recusa, `CONT` fica pendente.
- Pix e boleto ficam pendentes; o botão **"Simular pagamento confirmado"** faz o papel do webhook do Mercado Pago.
- Contas de exemplo: Maria tem o plano Anual (teste o downgrade e o cancelamento) e Pedro tem o Mensal com 10 dias restantes (teste o crédito proporcional no upgrade).

**Segurança do pagamento — leia antes de ligar o real:**

1. O número do cartão **nunca** passa pelo nosso código: o SDK do Mercado Pago gera um *token* no navegador.
   O formulário simulado imita isso (abra o `localStorage` e confira: só ficam bandeira e 4 últimos dígitos).
2. Com `VITE_MP_PUBLIC_KEY` no `.env`, o checkout troca o formulário simulado pelo **Card Payment Brick** oficial.
3. Só a **Public Key** vai para o front. O **Access Token** é segredo e fica no PHP, que cria o pagamento,
   recebe o webhook (`POST /webhooks/mercadopago`) e ativa a assinatura.
4. O valor cobrado é sempre calculado no servidor (`POST /assinatura/cotacao`); o front só mostra.

**Sobre o áudio:** sem arquivo vinculado, a vitrola roda em *modo demonstração* (o tempo anda, mas sem som).
Na ficha do item, o ícone ♪ de cada faixa permite escolher um MP3/FLAC do seu computador para tocar de verdade.
Sem back-end, esse vínculo dura até recarregar a página.

## Fase 5 — Suporte, backup, painel administrativo e manutenção

| Requisito | Onde |
|---|---|
| Central de ajuda com busca e artigos com "foi útil?" (9.5) | `pages/suporte/SuportePage.jsx`, `ArtigoPage.jsx` |
| Abrir ticket com sugestão de artigos enquanto digita, anexos e prioridade automática (Premium sobe) | `pages/suporte/NovoTicketPage.jsx` |
| Conversa do ticket, "resolvido" e pesquisa de satisfação CSAT | `pages/suporte/TicketPage.jsx` |
| Backup do usuário: exportar JSON, importar com **prévia** (juntar ou substituir), respeitando o limite do plano (RF094/RF095) | Configurações → Backup da coleção |
| Backup automático com retenção por plano (7/30 dias) e pedido de restauração (7.2) | Configurações → Backups automáticos |
| Painel admin com papéis e permissões (RBAC: superadmin, admin, suporte, financeiro...) (10.1) | `components/admin/AdminLayout.jsx`, `utils/permissoes.js` |
| Visão geral: usuários, assinantes, MRR, churn, tickets, CSAT, CTR + gráficos | `pages/admin/AdminDashboardPage.jsx` |
| Usuários e perfil 360°, suspender (com motivo), trocar papel com regra de nível (9.2) | `AdminUsuariosPage.jsx`, `AdminUsuarioPage.jsx` |
| Fila de tickets por prioridade, assumir, nota interna, respostas prontas (9.5) | `AdminTicketsPage.jsx`, `AdminTicketPage.jsx` |
| CRM: segmentos por regra + automações de e-mail sem reenvio em 7 dias (9.3, 9.4) | `AdminCrmPage.jsx` |
| Financeiro: transações, motivos de cancelamento, reembolso | `AdminFinanceiroPage.jsx` |
| Backup do sistema: histórico, backup manual passo a passo com SHA-256 real, teste de integridade, cópia imutável, restauração (7.3–7.5) | `AdminBackupPage.jsx` |
| Log de auditoria com antes/depois (10.2, RNF034) | `AdminLogsPage.jsx`, `services/auditoria.js` |
| **Modo manutenção** emergencial, programada e silenciosa; página pública com contagem regressiva; aviso 24h antes; acesso da equipe registrado (Anexo 2, RF100–RF109) | `AdminManutencaoPage.jsx`, `pages/manutencao/`, `components/manutencao/PortaoManutencao.jsx` |

**Contas da equipe para testar** (senha `Demo@123` em todas):

| E-mail | Papel | Vê no painel |
|---|---|---|
| `admin@radiola.com` | Superadmin | tudo, inclusive backup manual e manutenção |
| `suporte@radiola.com` | Suporte | visão geral, usuários (só leitura) e tickets |
| `financeiro@radiola.com` | Financeiro | visão geral e financeiro (com reembolso) |

O link **Painel admin** aparece no menu lateral (e em Configurações, no celular) só para a equipe.
Para ver o modo manutenção como cliente: ligue em *Painel → Manutenção*, saia e entre com `demo@radiola.com`
(no modo mock o "banco" é o `localStorage` do navegador, então use a mesma janela). Para desligar, clique em
**Sou da equipe** / **Entrar com outra conta** e entre como admin — o `/login` nunca é bloqueado. Ou use *Ver prévia*.

**Por que o painel é "lazy":** as telas de `/admin` são carregadas com `React.lazy`. Cliente comum nunca
baixa esse código — o app fica mais leve e a área administrativa não fica exposta no pacote principal.
Mas atenção: **esconder no front não é segurança**. Cada endpoint `/admin/*` do PHP precisa conferir a permissão
(o `exigir()` do `adminService.js` mostra exatamente o que o `AdminMiddleware.php` deve fazer).

## Fase 6 — Deezer, Apple Music, inglês/espanhol e app mobile

### Streaming: Deezer e Apple Music
| O quê | Onde |
|---|---|
| Deezer: busca na API pública + prévia de 30 s tocando na vitrola; login OAuth opcional (`VITE_DEEZER_APP_ID`) | `services/streaming/deezerService.js`, `pages/callback/DeezerCallbackPage.jsx` |
| Apple Music: iTunes Search (prévias) sem configurar nada; faixa completa com MusicKit JS + developer token do back-end | `services/streaming/appleMusicService.js` |
| Todos os serviços com a MESMA interface (padrão Strategy/Adapter): busca unificada, fallback e configurações só fazem `.map()` | `services/streaming/servicos.js` |
| Ordem de preferência nas configurações: sem arquivo digitalizado, a vitrola tenta o 1º serviço conectado, depois o 2º… | `contexts/StreamingContext.jsx`, `PlayerContext.jsx` |
| JSONP para APIs sem CORS (Deezer e iTunes) — com timeout e limpeza | `services/streaming/jsonp.js` |

### Idiomas: português, inglês e espanhol (RNF020)
- Sem biblioteca: `src/i18n/index.js` tem ~80 linhas com `t('chave', { variaveis })`, **plural** (`_one`/`_other` via `Intl.PluralRules`) e reserva no português.
- Idioma inicial: o escolhido antes → o do navegador → português. Fica salvo também no perfil (`idioma_preferido`), então vale em qualquer aparelho.
- Troca ao vivo (sem recarregar) no seletor **PT · EN · ES** do menu, do login e das configurações.
- Datas, números e moeda seguem o idioma pelo `Intl` (a moeda continua sendo o real). O CSV exportado usa `,` em inglês e `;` nos outros.
- **Valor ≠ rótulo:** o banco continua gravando `'Ótimo'`, `'LP Duplo'`…; só o texto exibido é traduzido (`src/i18n/dominio.js`).
- Toda chamada à API manda `Accept-Language`: o PHP deve responder mensagens e textos (planos, artigos) no idioma pedido. O mock já faz isso com os planos.
- `npm run i18n:check` compara as chaves dos 3 dicionários e acusa `t('chave')` que não existe (dá para pôr no CI).
- Ficam em português de propósito: **conteúdo** criado por pessoas (posts, bios, artigos da ajuda, anúncios) e o **painel administrativo** (ferramenta interna da equipe).

### App mobile: PWA + Capacitor
O documento falava em React Native, mas isso obrigaria a reescrever todas as telas. Com **PWA** o mesmo código vira app:
- `public/manifest.webmanifest` + ícones (inclusive *maskable* para Android) + atalhos (Adicionar, Escanear, Vitrola).
- `public/sw.js`: service worker escrito à mão e comentado. Telas: rede primeiro com reserva offline; JS/CSS: cache primeiro (o nome tem hash); **API e pagamento nunca vão para o cache**.
- Botão **Instalar o app** em Configurações (Android/Chrome) e passo a passo para iPhone.
- Aviso de **versão nova** (o usuário decide quando atualizar) e faixa de **sem internet**.
- Modo offline (RF093): com o back-end real, a última leitura do catálogo e do perfil fica no aparelho e aparece sem internet (só leitura). Tudo é apagado no logout.
- O service worker só liga no **build** (`npm run build && npm run preview`), não no `npm run dev`.

Para gerar o app de loja com o **mesmo código** (Capacitor já configurado em `capacitor.config.json`):
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android   # e/ou @capacitor/ios (precisa de Mac)
npm run build
npx cap add android
npx cap sync
npx cap open android        # abre no Android Studio para gerar o .apk/.aab
```
No app nativo, cadastre também os redirects `capacitor://localhost/callback/spotify` (e Deezer) nos painéis dos serviços.

## Estrutura

```
src/
├── components/        Peças reutilizáveis (social/: Avatar, CartaoPost, NovoPost, Selo, BotaoAmizade, NavSocial)
│   ├── ui/            Botao, Campo, Modal, Alerta, Icone, Estados (carregando/vazio/erro)
│   ├── layout/        AppLayout (menu + mini player) e AuthLayout
│   ├── catalogo/      FichaItem, CapaMidia, filtros e seções do formulário
│   ├── encarte/       EncartePainel (Wikipédia + anotações)
│   ├── scanner/       LeitorCamera
│   ├── assinatura/    FormCartao, CartaoMercadoPago, RecursoPremium, AvisosAssinatura
│   ├── publicidade/   Anuncio (banner, card, post), IntervaloPublicitario, OndeComprar
│   └── player/        Vitrola, RadioValvulas, Jukebox, GravadorRolo, Controles, MiniPlayer, ListaFila
├── pages/             Uma pasta por área, cada página é um .jsx
├── contexts/          Estado global: Auth (usuário), Plano (assinatura), Streaming (Spotify), Player (o que toca), Toast
├── hooks/             useCarregar, useDebounce, useTema
├── services/          Comunicação com o back-end (ou com o mock), Spotify e Wikipédia
├── mocks/             Dados de exemplo
├── routes/            Mapa de rotas e guardas de autenticação
├── utils/             Constantes, formatadores, validadores, exportação
└── styles/            Tokens de design (cores, fontes) e estilos globais
```

Cada componente tem seu próprio `.module.css` (CSS Modules): as classes ficam isoladas por arquivo,
então `.titulo` no catálogo nunca briga com `.titulo` no player.

## Ligando no back-end PHP

1. Copie `.env.example` para `.env` e mude `VITE_USE_MOCK=false`.
2. Ajuste `VITE_API_URL` para o endereço da API.
3. A API precisa responder nestes endpoints (já usados em `src/services/`):

| Método | Rota | Corpo / retorno |
|---|---|---|
| POST | `/auth/login` | `{ email, senha }` → `{ token, usuario }` |
| POST | `/auth/register` | `{ nome, email, senha }` → `{ token, usuario }` |
| GET | `/auth/me` | → `usuario` |
| POST | `/auth/forgot-password` | `{ email }` |
| GET | `/itens?busca=&tipo=&local=&ordem=` | → lista de itens |
| GET | `/itens/:id` | → item com `faixas[]` e `localizacao{}` |
| POST | `/itens` | item → item criado |
| PUT | `/itens/:id` | item → item atualizado |
| DELETE | `/itens/:id` | |
| PUT | `/itens/:id/anotacoes` | `{ id_faixa, conteudo }` → anotações do item |
| PATCH | `/auth/me` | `{ nome, apelido, bio }` → usuário |
| GET | `/perfis/:apelido` | → `{ usuario, relacao, estatisticas, estante, amigos, posts }` |
| GET | `/usuarios?busca=` | → usuários com `relacao` |
| POST | `/usuarios/:id/bloquear` | |
| GET / POST | `/amizades` | → `{ amigos, recebidas, enviadas, bloqueados }` / `{ id_usuario }` |
| GET | `/amizades/pendentes` | → `{ total }` |
| PATCH / DELETE | `/amizades/:id` | `{ acao: 'aceitar' \| 'recusar' \| 'bloquear' }` |
| POST | `/convites` | `{ email }` → `{ link }` |
| GET | `/feed` | → posts com `autor`, `curtidas`, `curtiu`, `comentarios[]` |
| POST / DELETE | `/posts`, `/posts/:id` | |
| POST | `/posts/:id/curtir`, `/posts/:id/comentarios` | → post atualizado |
| GET / POST | `/grupos`, `/grupos/:id` | |
| POST / DELETE | `/grupos/:id/membros` | entrar / sair |
| POST | `/grupos/:id/posts` | `{ titulo, conteudo }` |
| POST | `/conquistas/verificar` | → `{ conquistas, pontos, nivel, novas }` |
| GET | `/usuarios/:id/conquistas` | |
| GET | `/scanner/:codigo` | → lista de edições `{ id, fonte, titulo, artista, ano, pais, gravadora, numero_catalogo, formato, capa_imagem, faixas? }` |
| GET | `/scanner/busca?titulo=&artista=` | → lista de edições |
| PATCH | `/itens/:id` | `{ digitalizada }` |
| GET | `/planos` | → planos com `recursos` |
| GET | `/assinatura` | → `{ plano, assinatura, premium, emTrial, trialDisponivel, transacoes, membrosFamilia, avisos }` |
| POST | `/assinatura/trial` | inicia o teste de 7 dias |
| POST | `/assinatura/cotacao` | `{ plano, cupom }` → `{ linhas, total, agendado }` |
| POST | `/pagamentos` | `{ plano, cupom, pagamento: { metodo, cartao: { token, ... } }, comprovante }` → `{ transacao }` |
| GET | `/pagamentos/:id` | → transação (o front consulta a cada 3 s enquanto pendente) |
| POST | `/assinatura/cancelar` | `{ motivo, detalhe, aceitouOferta }` |
| POST | `/assinatura/reativar` · DELETE `/assinatura/mudanca` | |
| POST / DELETE | `/familia/membros` | `{ email }` |
| POST | `/propagandas/impressoes`, `/propagandas/cliques`, `/afiliados/cliques` | registro de métricas |
| GET | `/ajuda/artigos?busca=` · `/ajuda/artigos/:slug` | base de conhecimento |
| POST | `/ajuda/artigos/:id/voto` | `{ util }` |
| GET / POST | `/tickets` | lista / `{ categoria, assunto, descricao, anexos }` |
| GET | `/tickets/:id` | → ticket com `mensagens[]` (sem as notas internas!) |
| POST | `/tickets/:id/respostas` · `/resolver` · `/avaliacao` | `{ mensagem, anexos }` · — · `{ nota, comentario }` |
| GET | `/backup/exportar` · POST `/backup/importar` | JSON `radiola-de-ficha/backup` · `{ itens, modo }` |
| GET | `/backup/disponiveis` · POST `/backup/restauracoes` | `{ retencao_dias, backups, solicitacoes }` · `{ id_backup, observacoes }` |
| GET | `/status` | **público**: `{ em_manutencao, tipo, inicio, fim_previsto, titulo, mensagem, motivo }` (responder 503 + `Retry-After` nas outras rotas durante a manutenção) |
| GET | `/admin/dashboard` | indicadores |
| GET | `/admin/usuarios?busca=` · `/admin/usuarios/:id` | lista · perfil 360° |
| PATCH / PUT | `/admin/usuarios/:id/status` · `/admin/usuarios/:id/papel` | `{ ativo, motivo }` · `{ papel }` |
| GET / PATCH | `/admin/tickets`, `/admin/tickets/:id` | `{ prioridade, status, assumir }` |
| POST | `/admin/tickets/:id/respostas` | `{ mensagem, interna, novoStatus }` |
| GET | `/admin/crm` · PATCH `/admin/crm/automacoes/:id` · POST `.../executar` | segmentos, automações, e-mails |
| GET | `/admin/financeiro` · POST `/admin/transacoes/:id/reembolso` | `{ motivo }` |
| GET / POST | `/admin/backups` · POST `/admin/backups/:id/teste` · `/admin/restauracoes/:id/executar` | |
| GET | `/admin/logs?acao=` | auditoria |
| GET / DELETE | `/admin/manutencao` | config · desativar |
| PATCH | `/auth/me/preferencias` | `{ idioma_preferido }` (`pt-BR`, `en`, `es`) |
| GET | `/streaming/apple/token` (exemplo) | `{ token }` — developer token do Apple Music, gerado no servidor |
| POST / PUT | `/admin/manutencao/emergencial`, `/admin/manutencao/agendar`, `/admin/manutencao/pagina` | |

O token vai no cabeçalho `Authorization: Bearer <token>`. Erros devem vir como `{ "mensagem": "..." }`.
Os nomes dos campos são os mesmos das colunas do banco da documentação (`tipo_midia`, `ano_lancamento`...),
então nenhuma página precisa mudar.

## Subindo no GitHub

```bash
git remote add origin https://github.com/SEU-USUARIO/radiola-de-ficha.git
git branch -M main
git push -u origin main
```

O repositório já vem com um commit inicial e `.gitignore` configurado (`node_modules`, `dist` e `.env` ficam de fora).
A documentação sugere as branches `main`, `develop` e `feature/*` (RNF041).

## Fases do projeto

- ✅ **Fase 0:** fundação (estrutura, autenticação)
- ✅ **Fase 1:** catálogo, faixas, localização, player vitrola, exportação CSV
- ✅ **Fase 2:** Spotify, busca unificada, encarte digital, perfil "Rádio de Válvulas"
- ✅ **Fase 3:** perfil público, amizades, feed, grupos, conquistas, perfil "Jukebox"
- ✅ **Fase 3.5:** scanner de código de barras, acabamento do suporte a K7, perfil "Gravador de Rolo"
- ✅ **Fase 4:** planos, Mercado Pago, propagandas, afiliados
- ✅ **Fase 5:** suporte, backup, painel administrativo, CRM, modo manutenção
- ✅ **Fase 6:** Deezer, Apple Music, inglês/espanhol, app instalável (PWA + Capacitor)
- **Daqui em diante:** back-end PHP real, testes automatizados no repositório, publicação nas lojas
