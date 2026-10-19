/*
 * Ícones em SVG inline (sem biblioteca externa).
 * stroke="currentColor" faz o ícone herdar a cor do texto do pai,
 * então funciona sozinho nos temas claro e escuro.
 */

const CAMINHOS = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  disco: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  vitrola: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <circle cx="10" cy="12.5" r="4.5" />
      <path d="M17 8v6l-3 2" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  busca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" />,
  pause: <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" />,
  proxima: <path d="M6 5l9 7-9 7zM17 5v14" />,
  anterior: <path d="M18 5l-9 7 9 7zM7 5v14" />,
  aleatorio: <path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" />,
  repetir: <path d="M4 12V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 12v3a3 3 0 0 1-3 3H5M8 21l-3-3 3-3" />,
  volume: <path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />,
  mudo: <path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" />,
  editar: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  lixo: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  sair: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />,
  tema: <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  fila: <path d="M4 6h12M4 12h12M4 18h8M18 15v6M15 18h6" />,
  voltar: <path d="M15 5l-7 7 7 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  local: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  cima: <path d="M6 15l6-6 6 6" />,
  baixo: <path d="M6 9l6 6 6-6" />,
  engrenagem: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  livro: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7" />,
  externo: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  pessoas: <path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M22 20c0-2.6-1.6-4.9-4-5.7" />,
  amigo: <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c0-3.9 3.1-7 7-7 1.4 0 2.6.4 3.7 1M18 15v6M15 18h6" />,
  grupo: <path d="M4 5h16v11H8l-4 4zM8 9h8M8 12h5" />,
  medalha: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M8.5 11 6 3h4l2 5 2-5h4l-2.5 8" />
    </>
  ),
  compartilhar: <path d="M12 3v12M7 8l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  arquivo: <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z" />,
};

export default function Icone({ nome, tamanho = 18, titulo, ...props }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? 'img' : undefined}
      {...props}
    >
      {titulo && <title>{titulo}</title>}
      {CAMINHOS[nome]}
    </svg>
  );
}
