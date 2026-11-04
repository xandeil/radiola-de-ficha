import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/services/socialService';
import Avatar from './Avatar';
import Selo from './Selo';
import Icone from '@/components/ui/Icone';
import { tempoRelativo } from '@/utils/formatadores';
import { conquistaDoPost } from '@/i18n/dominio';
import styles from './CartaoPost.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Um post do feed (RF062–RF068). O "verbo" muda pelo tipo do post:
 * ouvindo, resenha, recomendação, conquista, adicionou ou texto livre.
 *
 * Curtir usa "atualização otimista": o coração muda NA HORA e a chamada
 * ao servidor vai em seguida. Se der erro, desfazemos. É o que faz apps
 * como Instagram parecerem instantâneos.
 */


function Estrelas({ nota }) {
  const t = useT();
  return (
    <span className={styles.estrelas} aria-label={t('social.post.notaDe5', { n: nota })}>
      {'★'.repeat(nota)}
      <span className={styles.estrelaVazia}>{'★'.repeat(5 - nota)}</span>
    </span>
  );
}

function Referencia({ post }) {
  const t = useT();
  const r = post.referencia;
  if (!r) return null;
  if (post.tipo_post === 'conquista') {
    const c = conquistaDoPost(r);
    return (
      <div className={styles.referencia}>
        <Selo nome={c.nome} cor={r.cor_capa} tamanho={52} />
        <div className={styles.refTexto}>
          <strong>{c.nome}</strong>
          <span>{c.descricao}</span>
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
          {t('social.post.ouvir')} <Icone nome="externo" tamanho={12} />
        </a>
      )}
    </div>
  );
}

export default function CartaoPost({ post: inicial, aoExcluir }) {
  const { usuario } = useAuth();
  const t = useT();
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
            {post.tipo_post !== 'texto' && t(`social.post.verbo.${post.tipo_post}`)}
            {post.destinatario && (
              <>
                {' '}{t('social.post.para')}{' '}
                <Link to={`/perfil/${post.destinatario.apelido}`} className={styles.nome}>
                  {post.destinatario.id === usuario?.id ? t('social.post.voce') : post.destinatario.nome}
                </Link>
              </>
            )}
          </p>
          <small>
            {tempoRelativo(post.data_publicacao)} · {t(`social.post.vis.${post.visibilidade}`)}
          </small>
        </div>
        {meu && (
          <button type="button" className={styles.icone} onClick={excluir} aria-label={t('social.post.excluir')} title={t('social.post.excluirCurto')}>
            <Icone nome="lixo" tamanho={16} />
          </button>
        )}
      </header>

      <Referencia post={post} />
      {post.nota > 0 && <Estrelas nota={post.nota} />}
      {post.conteudo_texto && <p className={styles.texto}>{post.conteudo_texto}</p>}

      <footer className={styles.acoes}>
        <button type="button" className={`${styles.acao} ${post.curtiu ? styles.curtido : ''}`} onClick={curtir} aria-pressed={post.curtiu}>
          <span aria-hidden="true">{post.curtiu ? '♥' : '♡'}</span> {post.curtidas || ''} <span className="sr-only">{t('social.post.curtidas')}</span>
        </button>
        <button type="button" className={styles.acao} onClick={() => setAbrirComentarios((a) => !a)} aria-expanded={abrirComentarios}>
          💬 {post.comentarios.length || ''} <span className="sr-only">{t('social.post.comentarios')}</span>
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
              aria-label={t('social.post.escreverComentario')}
              placeholder={t('social.post.comentarioPh')}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={enviando || !comentario.trim()}>
              {t('social.post.enviar')}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
