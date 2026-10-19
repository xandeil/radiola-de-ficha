import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { socialService } from '@/services/socialService';
import { conquistaService } from '@/services/conquistaService';
import { useToast } from '@/contexts/ToastContext';
import Avatar from '@/components/social/Avatar';
import Selo from '@/components/social/Selo';
import BotaoAmizade from '@/components/social/BotaoAmizade';
import CartaoPost from '@/components/social/CartaoPost';
import CapaMidia from '@/components/catalogo/CapaMidia';
import Botao from '@/components/ui/Botao';
import { ModalConfirmacao } from '@/components/ui/Modal';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { formatarData } from '@/utils/formatadores';
import styles from './PerfilPage.module.css';

/*
 * RF057 – Perfil público: /perfil/:apelido
 * Mostra só o que a pessoa deixou público (o service já filtra).
 * A mesma página serve para o SEU perfil (com "Editar perfil") e para o
 * dos outros (com o botão de amizade).
 */
export default function PerfilPage() {
  const { apelido } = useParams();
  const { mostrar } = useToast();
  const perfil = useCarregar(() => socialService.perfilPublico(apelido), [apelido]);
  const idUsuario = perfil.dados?.usuario.id;
  const conquistas = useCarregar(
    () => (idUsuario ? conquistaService.deUsuario(idUsuario) : Promise.resolve(null)),
    [idUsuario],
  );
  const [aba, setAba] = useState('estante');
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false);

  if (perfil.carregando && !perfil.dados) return <Carregando />;
  if (perfil.erro) return <EstadoErro erro={perfil.erro} />;

  const { usuario, relacao, estatisticas, estante, posts, amigos } = perfil.dados;
  const souEu = relacao.tipo === 'eu';
  const desbloqueadas = conquistas.dados?.conquistas.filter((c) => c.desbloqueada) || [];

  const bloquear = async () => {
    await socialService.bloquear(usuario.id);
    setConfirmandoBloqueio(false);
    mostrar(`${usuario.nome} foi bloqueado`);
    perfil.recarregar();
  };

  return (
    <>
      <header className={styles.capa}>
        <Avatar usuario={usuario} tamanho={96} link={false} />
        <div className={styles.identidade}>
          <h1>{usuario.nome}</h1>
          <span className={styles.apelido}>@{usuario.apelido}</span>
          {usuario.bio && <p className={styles.bio}>{usuario.bio}</p>}
          <div className={styles.meta}>
            <span>
              <strong>{estatisticas.total}</strong> itens
            </span>
            <span>
              <strong>{amigos}</strong> amigos
            </span>
            {conquistas.dados && (
              <span>
                Nível <strong>{conquistas.dados.nivel.nivel}</strong> · {conquistas.dados.nivel.nome}
              </span>
            )}
            {usuario.data_cadastro && <span>Desde {formatarData(usuario.data_cadastro)}</span>}
          </div>
        </div>
        <div className={styles.acoes}>
          {souEu ? (
            <Botao variante="secundario" para="/configuracoes">
              Editar perfil
            </Botao>
          ) : (
            <>
              <BotaoAmizade usuario={usuario} relacao={relacao} aoMudar={perfil.recarregar} />
              {relacao.tipo !== 'bloqueado' && (
                <Botao variante="fantasma" tamanho="pequeno" onClick={() => setConfirmandoBloqueio(true)}>
                  Bloquear
                </Botao>
              )}
            </>
          )}
        </div>
      </header>

      {relacao.tipo === 'bloqueado' ? (
        <EstadoVazio titulo="Você bloqueou este perfil" mensagem="Desbloqueie para ver a estante e as publicações." />
      ) : (
        <>
          <section className={styles.formatos} aria-label="Coleção por formato">
            {Object.entries(estatisticas.porTipo).map(([tipo, qtd]) => (
              <span key={tipo} className={styles.formato}>
                <strong>{qtd}</strong> {tipo}
              </span>
            ))}
            {estatisticas.generos > 0 && (
              <span className={styles.formato}>
                <strong>{estatisticas.generos}</strong> gêneros
              </span>
            )}
          </section>

          {desbloqueadas.length > 0 && (
            <section className={styles.selos} aria-label="Selos conquistados">
              {desbloqueadas.map((c) => (
                <div key={c.id} className={styles.selo} title={c.descricao}>
                  <Selo nome={c.nome} cor={c.cor} tamanho={56} />
                  <span>{c.nome}</span>
                </div>
              ))}
            </section>
          )}

          <div className={styles.abas} role="tablist">
            <button type="button" role="tab" aria-selected={aba === 'estante'} onClick={() => setAba('estante')}>
              Estante {souEu ? '' : 'pública'} ({estante.length})
            </button>
            <button type="button" role="tab" aria-selected={aba === 'posts'} onClick={() => setAba('posts')}>
              Publicações ({posts.length})
            </button>
          </div>

          {aba === 'estante' ? (
            estante.length === 0 ? (
              <EstadoVazio
                titulo={souEu ? 'Sua estante está vazia' : 'Nada na estante pública'}
                mensagem={souEu ? 'Cadastre itens e marque "Mostrar na estante pública".' : 'Esta pessoa ainda não deixou nenhum item público.'}
              />
            ) : (
              <div className={styles.estante}>
                {estante.map((item) => {
                  const conteudo = (
                    <>
                      <CapaMidia item={item} />
                      {souEu && !item.publico && <span className={styles.privado}>Privado</span>}
                    </>
                  );
                  return souEu ? (
                    <Link key={item.id} to={`/catalogo/${item.id}`} className={styles.itemEstante}>
                      {conteudo}
                    </Link>
                  ) : (
                    <div key={item.id} className={styles.itemEstante}>
                      {conteudo}
                    </div>
                  );
                })}
              </div>
            )
          ) : posts.length === 0 ? (
            <EstadoVazio titulo="Nenhuma publicação visível" />
          ) : (
            <div className={styles.posts}>
              {posts.map((p) => (
                <CartaoPost key={p.id} post={p} aoExcluir={perfil.recarregar} />
              ))}
            </div>
          )}
        </>
      )}

      <ModalConfirmacao
        aberto={confirmandoBloqueio}
        titulo={`Bloquear ${usuario.nome}?`}
        mensagem="Vocês deixam de ser amigos, e essa pessoa não verá mais seu perfil nem suas publicações."
        textoConfirmar="Bloquear"
        perigo
        aoConfirmar={bloquear}
        aoFechar={() => setConfirmandoBloqueio(false)}
      />
    </>
  );
}
