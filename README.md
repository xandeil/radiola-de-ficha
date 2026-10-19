# 📀 Radiola de Ficha — Front-end

Catálogo de mídia física (LP, CD, DVD e fita K7) com player em formato de vitrola retrô.
Este repositório é o **front-end em React + JavaScript**, cobrindo a **Fase 1 (MVP)** da documentação do projeto.

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

**Sobre o áudio:** sem arquivo vinculado, a vitrola roda em *modo demonstração* (o tempo anda, mas sem som).
Na ficha do item, o ícone ♪ de cada faixa permite escolher um MP3/FLAC do seu computador para tocar de verdade.
Sem back-end, esse vínculo dura até recarregar a página.

## Estrutura

```
src/
├── components/        Peças reutilizáveis
│   ├── ui/            Botao, Campo, Modal, Alerta, Icone, Estados (carregando/vazio/erro)
│   ├── layout/        AppLayout (menu + mini player) e AuthLayout
│   ├── catalogo/      FichaItem, CapaMidia, filtros e seções do formulário
│   └── player/        Vitrola, Controles, MiniPlayer, ListaFila
├── pages/             Uma pasta por área, cada página é um .jsx
├── contexts/          Estado global: AuthContext (usuário) e PlayerContext (o que está tocando)
├── hooks/             useCarregar, useDebounce, useTema
├── services/          Comunicação com o back-end (ou com o mock)
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

## Próximas fases

- **Fase 2:** Spotify, busca unificada, encarte digital, perfil "Rádio de Válvulas"
- **Fase 3:** perfil público, amizades, feed, grupos, conquistas, perfil "Jukebox"
- **Fase 3.5:** scanner de código de barras, perfil "Gravador de Rolo"
- **Fase 4:** planos, Mercado Pago, propagandas
- **Fase 5:** suporte, backup, painel administrativo
