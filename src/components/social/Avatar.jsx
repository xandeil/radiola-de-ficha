import { Link } from 'react-router-dom';
import styles from './Avatar.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Avatar com a inicial do nome. A cor sai do id do usuário, então a
 * mesma pessoa tem sempre a mesma cor em qualquer tela.
 */
const CORES = ['#b4462a', '#3f6d7a', '#5c7a4f', '#a14d6b', '#c9a227', '#6b5a3a', '#2f5d62', '#7a3a5c'];

export default function Avatar({ usuario, tamanho = 40, link = true }) {
  const t = useT();
  if (!usuario) return null;
  const conteudo = (
    <span
      className={styles.avatar}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42, background: CORES[usuario.id % CORES.length] }}
      aria-hidden={link ? undefined : true}
    >
      {usuario.nome?.[0]?.toUpperCase()}
    </span>
  );
  if (!link || !usuario.apelido) return conteudo;
  return (
    <Link to={`/perfil/${usuario.apelido}`} className={styles.link} aria-label={t('social.avatar.perfilDe', { nome: usuario.nome })}>
      {conteudo}
    </Link>
  );
}
