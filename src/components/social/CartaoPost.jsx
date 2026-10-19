import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/services/socialService';
import Avatar from './Avatar';
import Selo from './Selo';
import Icone from '@/components/ui/Icone';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './CartaoPost.module.css';

/*
 * Um post do feed (RF062–RF068). O "verbo" muda pelo tipo do post:
 * ouvindo, resenha, recomendação, conquista, adicionou ou texto livre.
 *
 * Curtir usa "atualização otimista": o coração muda NA HORA e a chamada
 * ao servidor vai em seguida. Se der erro, desfazemos. É o que faz apps
 * como Instagram parecerem instantâneos.
 */

const VERBOS = {
  ouvindo: 'está ouvindo',
  resenha: 'escreveu uma resenha',
  recomendacao: 'recomendou',
  conquista: 'desbloqueou uma conquista',
  adicionou: 'adicionou à coleção',
  texto: '',
};

function Estrelas({ nota }) {
  return (
    <span className={styles.estrelas} aria-label={`Nota ${nota} de 5`}>
      {'★'.repeat(nota)}
      <span className={styles.estrelaVazia}>{'★'.repeat(5 - nota)}</span>
    </span>
  );
}

function Referencia({ post }) {
  const r = post.referencia;
  if (!r) return null;
  if (post.tipo_post === 'conquista') {
    return (
      <div className={styles.referencia}>
        <Selo nome={r.titulo} cor={r.cor_capa} tamanho={52} />
        <div className={styles.refTexto}>
          <strong>{r.titulo}</strong>
          <span>{r.descricao}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.referencia}>
      <span className={styles.miniCapa} style={{ background: r.cor_capa || 'var(--c-surface-2)' }} aria-hidden="true">
        {r.formato}
      </span>
      <div className={styles.refTexto}>
        <strong>{r.titulo}</strong>
        <span>{r.artista}</span>
      </div>
      {r.link && (
        <a href={r.link} target="_blank" rel="noreferrer" className={styles.ouvir}>
          Ouvir <Icone nome="externo" tamanho={12} />
        </a>
      )}
    </div>
  );
}

export default function CartaoPost({ post: inicial, aoExcluir }) {
  const { usuario } = useAuth();
  const [post, setPost] = useState(inicial);
  const [abrirComentarios, setAbrirComentarios] = useState(false);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const meu = post.autor?.id === usuario?.id;

  const curtir = async () => {
    const anterior = post;
    setPost({ ...post, curtiu: !post.curtiu, curtidas: post.curtidas + (post.curtiu ? -1 : 1) }); // otimista
    try {
      setPost(await socialService.curtir(post.id));
    } catch {
      setPost(anterior); // deu errado: volta como estava
    }
  };

  const comentar = async (e) => {
    e.preventDefault();
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      setPost(await socialService.comentar(post.id, comentario));
      setComentario('');
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async () => {
    await socialService.excluirPost(post.id);
    aoExcluir?.(post.id);
  };

  return (
    <article className={styles.post}>
      <header className={styles.cabecalho}>
        <Avatar usuario={post.autor} />
        <div className={styles.quem}>
          <p>
            <Link to={`/perfil/${post.autor?.apelido}`} className={styles.nome}>
              {post.autor?.nome}
            </Link>{' '}
            {VERBOS[post.tipo_post]}
            {post.destinatario && (
              <>
                {' '}para{' '}
                <Link to={`/perfil/${post.destinatario.apelido}`} className={styles.nome}>
                  {post.destinatario.id === usuario?.id ? 'você' : post.destinatario.nome}
                </Link>
              </>
            )}
          </p>
          <small>
            {tempoRelativo(post.data_publicacao)} · {{ publico: 'Público', amigos: 'Amigos', privado: 'Só eu' }[post.visibilidade]}
          </small>
        </div>
        {meu && (
          <button type="button" className={styles.icone} onClick={excluir} aria-label="Excluir publicação" title="Excluir">
            <Icone nome="lixo" tamanho={16} />
          </button>
        )}
      </header>

      <Referencia post={post} />
      {post.nota > 0 && <Estrelas nota={post.nota} />}
      {post.conteudo_texto && <p className={styles.texto}>{post.conteudo_texto}</p>}

      <footer className={styles.acoes}>
        <button type="button" className={`${styles.acao} ${post.curtiu ? styles.curtido : ''}`} onClick={curtir} aria-pressed={post.curtiu}>
          <span aria-hidden="true">{post.curtiu ? '♥' : '♡'}</span> {post.curtidas || ''} <span className="sr-only">curtidas</span>
        </button>
        <button type="button" className={styles.acao} onClick={() => setAbrirComentarios((a) => !a)} aria-expanded={abrirComentarios}>
          💬 {post.comentarios.length || ''} <span className="sr-only">comentários</span>
        </button>
      </footer>

      {abrirComentarios && (
        <div className={styles.comentarios}>
          {post.comentarios.map((c) => (
            <div key={c.id} className={styles.comentario}>
              <Avatar usuario={c.autor} tamanho={28} />
              <div>
                <Link to={`/perfil/${c.autor?.apelido}`} className={styles.nome}>
                  {c.autor?.nome}
                </Link>{' '}
                <span>{c.texto}</span>
                <small> · {tempoRelativo(c.data)}</small>
              </div>
            </div>
          ))}
          <form className={styles.novoComentario} onSubmit={comentar}>
            <input
              aria-label="Escrever comentário"
              placeholder="Escreva um comentário..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={enviando || !comentario.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
