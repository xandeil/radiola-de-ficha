import { useEffect, useState } from 'react';
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
import Botao from '@/components/ui/Botao';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import styles from './Social.module.css';

/*
 * RF068 – Feed de atividades: seus posts e os dos amigos, do mais novo
 * para o mais antigo. O post novo entra no topo da lista local na hora,
 * sem recarregar o feed inteiro.
 */
export default function FeedPage() {
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
      <TituloPagina titulo="Vitrola Social" subtitulo="O que seus amigos andam ouvindo e colecionando." />
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
              titulo="Seu feed está em silêncio"
              mensagem="Adicione amigos para ver o que eles estão ouvindo, ou faça a primeira publicação."
              acao={<Botao para="/amigos">Encontrar amigos</Botao>}
            />
          ) : (
            <div className={styles.lista}>
              {posts.map((p) => (
                <CartaoPost key={p.id} post={p} aoExcluir={(id) => setPosts((lista) => lista.filter((x) => x.id !== id))} />
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
                <Link to={`/perfil/${usuario?.apelido}`}>Ver meu perfil</Link>
              </div>
            </div>
            {progresso && (
              <div className={styles.nivelMini}>
                <span>
                  Nível {progresso.nivel.nivel} · <strong>{progresso.nivel.nome}</strong>
                </span>
                <span>{progresso.pontos} pts</span>
              </div>
            )}
          </section>

          <section className={styles.cartao}>
            <h2>Amigos</h2>
            {!amizades ? (
              <Carregando />
            ) : amizades.amigos.length === 0 ? (
              <p className={styles.muted}>Nenhum amigo ainda.</p>
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
                {amizades.recebidas.length} {amizades.recebidas.length === 1 ? 'pedido' : 'pedidos'} de amizade esperando
              </Link>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
