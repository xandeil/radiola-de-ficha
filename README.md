# 📀 Radiola de Ficha — Front-end

Catálogo de mídia física (LP, CD, DVD e fita K7) com player em formato de vitrola retrô.
Este repositório é o **front-end em React + JavaScript**, cobrindo as **Fases 0, 1, 2, 3 e 3.5** da documentação do projeto.

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

**Sobre o áudio:** sem arquivo vinculado, a vitrola roda em *modo demonstração* (o tempo anda, mas sem som).
Na ficha do item, o ícone ♪ de cada faixa permite escolher um MP3/FLAC do seu computador para tocar de verdade.
Sem back-end, esse vínculo dura até recarregar a página.

## Estrutura

```
src/
├── components/        Peças reutilizáveis (social/: Avatar, CartaoPost, NovoPost, Selo, BotaoAmizade, NavSocial)
│   ├── ui/            Botao, Campo, Modal, Alerta, Icone, Estados (carregando/vazio/erro)
│   ├── layout/        AppLayout (menu + mini player) e AuthLayout
│   ├── catalogo/      FichaItem, CapaMidia, filtros e seções do formulário
│   ├── encarte/       EncartePainel (Wikipédia + anotações)
│   ├── scanner/       LeitorCamera
│   └── player/        Vitrola, RadioValvulas, Jukebox, GravadorRolo, Controles, MiniPlayer, ListaFila
├── pages/             Uma pasta por área, cada página é um .jsx
├── contexts/          Estado global: AuthContext (usuário), StreamingContext (Spotify) e PlayerContext (o que está tocando)
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
- **Fase 4:** planos, Mercado Pago, propagandas
- **Fase 5:** suporte, backup, painel administrativo
- **Fase 6 (contínua):** Deezer, Apple Music, inglês/espanhol, app mobile
