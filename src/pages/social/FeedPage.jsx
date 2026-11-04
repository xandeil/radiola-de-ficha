import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCarregar } from '@/hooks/useCarregar';
import { useConquistas } from '@/hooks/useConquistas';
import { socialService } from '@/services/socialService';
import { catalogoService } from '@/services/catalogoService';
import { conquistaService } from '@/services/conquistaService';
import TituloPagina from '@/components/ui/TituloPagina';
import NavSocial from '@/components/social/NavSocial';
import NovoPost from '@/components/social/NovoPost';
import CartaoPost from '@/components/social/CartaoPost';
import Avatar from '@/components/social/Avatar';
import { PostPatrocinado } from '@/components/publicidade/Anuncio';
import Botao from '@/components/ui/Botao';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import styles from './Social.module.css';
import { useT } from '@/contexts/I18nContext';
import { descricaoConquista, nomeConquista, nomeNivel } from '@/i18n/dominio';

/*
 * RF068 – Feed de atividades: seus posts e os dos amigos, do mais novo
 * para o mais antigo. O post novo entra no topo da lista local na hora,
 * sem recarregar o feed inteiro.
 */
export default function FeedPage() {
  const t = useT();
  const { usuario } = useAuth();
  const { verificar } = useConquistas();
  const feed = useCarregar(() => socialService.feed(), []);
  const { dados: itens } = useCarregar(() => catalogoService.listar(), []);
  const { dados: amizades } = useCarregar(() => socialService.amizades(), []);
  const { dados: progresso } = useCarregar(() => conquistaService.verificar(), []);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (feed.dados) setPosts(feed.dados);
  }, [feed.dados]);

  const publicar = async (dados) => {
    const post = await socialService.publicar(dados);
    setPosts((p) => [post, ...p]);
    if (dados.tipo_post === 'resenha') verificar(); // pode render a conquista "Crítico"
  };

  return (
    <>
      <TituloPagina titulo={t('social.feed.titulo')} subtitulo={t('social.feed.subtitulo')} />
      <NavSocial />

      <div className={styles.duasColunas}>
        <div>
          <NovoPost itens={itens || []} amigos={amizades?.amigos || []} aoPublicar={publicar} />

          {feed.carregando ? (
            <Carregando />
          ) : feed.erro ? (
            <EstadoErro erro={feed.erro} aoTentarDeNovo={feed.recarregar} />
          ) : posts.length === 0 ? (
            <EstadoVazio
              titulo={t('social.feed.vazioTitulo')}
              mensagem={t('social.feed.vazioTexto')}
              acao={<Botao para="/amigos">{t('social.feed.encontrarAmigos')}</Botao>}
            />
          ) : (
            <div className={styles.lista}>
              {posts.map((p, i) => (
                <Fragment key={p.id}>
                  {i === 3 && <PostPatrocinado pagina="/feed" />}
                  <CartaoPost post={p} aoExcluir={(id) => setPosts((lista) => lista.filter((x) => x.id !== id))} />
                </Fragment>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.lateral}>
          <section className={styles.cartao}>
            <div className={styles.eu}>
              <Avatar usuario={usuario} tamanho={48} />
              <div>
                <strong>{usuario?.nome}</strong>
                <Link to={`/perfil/${usuario?.apelido}`}>{t('social.feed.verMeuPerfil')}</Link>
              </div>
            </div>
            {progresso && (
              <div className={styles.nivelMini}>
                <span>
                  {t('social.feed.nivel', { n: progresso.nivel.nivel })} · <strong>{nomeNivel(progresso.nivel)}</strong>
                </span>
                <span>{t('social.feed.pts', { n: progresso.pontos })}</span>
              </div>
            )}
          </section>

          <section className={styles.cartao}>
            <h2>{t('social.feed.amigos')}</h2>
            {!amizades ? (
              <Carregando />
            ) : amizades.amigos.length === 0 ? (
              <p className={styles.muted}>{t('social.feed.nenhumAmigo')}</p>
            ) : (
              <ul className={styles.listaPessoas}>
                {amizades.amigos.slice(0, 6).map((a) => (
                  <li key={a.id_amizade}>
                    <Avatar usuario={a.usuario} tamanho={32} />
                    <Link to={`/perfil/${a.usuario.apelido}`}>{a.usuario.nome}</Link>
                  </li>
                ))}
              </ul>
            )}
            {amizades?.recebidas.length > 0 && (
              <Link to="/amigos" className={styles.pendente}>
                {t('social.feed.pedidos', { count: amizades.recebidas.length })}
              </Link>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
