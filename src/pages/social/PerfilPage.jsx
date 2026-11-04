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
import { useT } from '@/contexts/I18nContext';
import { descricaoConquista, nomeConquista, nomeNivel, rotuloDominio } from '@/i18n/dominio';

/*
 * RF057 – Perfil público: /perfil/:apelido
 * Mostra só o que a pessoa deixou público (o service já filtra).
 * A mesma página serve para o SEU perfil (com "Editar perfil") e para o
 * dos outros (com o botão de amizade).
 */
export default function PerfilPage() {
  const t = useT();
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
    mostrar(t('social.perfil.bloqueado', { nome: usuario.nome }));
    perfil.recarregar();
  };

  return (
    <>
      <header className={styles.capa}>
        <Avatar usuario={usuario} tamanho={96} link={false} />
        <div className={styles.identidade}>
          <h1>{usuario.nome}</h1>
          <span className={styles.apelido}>@{usuario.apelido}</span>
          {/* RF048 – selo especial de assinante anual */}
          {['premium_anual', 'familia'].includes(usuario.plano) && <span className={styles.seloAnual}>{t('social.perfil.assinanteAnual')}</span>}
          {usuario.bio && <p className={styles.bio}>{usuario.bio}</p>}
          <div className={styles.meta}>
            <span>
              <strong>{estatisticas.total}</strong> {t('social.perfil.itens')}
            </span>
            <span>
              <strong>{amigos}</strong> {t('social.perfil.amigos')}
            </span>
            {conquistas.dados && (
              <span>
                {t('social.perfil.nivel')} <strong>{conquistas.dados.nivel.nivel}</strong> · {nomeNivel(conquistas.dados.nivel)}
              </span>
            )}
            {usuario.data_cadastro && <span>{t('social.perfil.desde', { data: formatarData(usuario.data_cadastro) })}</span>}
          </div>
        </div>
        <div className={styles.acoes}>
          {souEu ? (
            <Botao variante="secundario" para="/configuracoes">
              {t('social.perfil.editar')}
            </Botao>
          ) : (
            <>
              <BotaoAmizade usuario={usuario} relacao={relacao} aoMudar={perfil.recarregar} />
              {relacao.tipo !== 'bloqueado' && (
                <Botao variante="fantasma" tamanho="pequeno" onClick={() => setConfirmandoBloqueio(true)}>
                  {t('social.perfil.bloquear')}
                </Botao>
              )}
            </>
          )}
        </div>
      </header>

      {relacao.tipo === 'bloqueado' ? (
        <EstadoVazio titulo={t('social.perfil.voceBloqueou')} mensagem={t('social.perfil.desbloqueieTexto')} />
      ) : (
        <>
          <section className={styles.formatos} aria-label={t('social.perfil.porFormato')}>
            {Object.entries(estatisticas.porTipo).map(([tipo, qtd]) => (
              <span key={tipo} className={styles.formato}>
                <strong>{qtd}</strong> {rotuloDominio('tipo', tipo)}
              </span>
            ))}
            {estatisticas.generos > 0 && (
              <span className={styles.formato}>
                <strong>{estatisticas.generos}</strong> {t('social.perfil.generos')}
              </span>
            )}
          </section>

          {desbloqueadas.length > 0 && (
            <section className={styles.selos} aria-label={t('social.perfil.selos')}>
              {desbloqueadas.map((c) => (
                <div key={c.id} className={styles.selo} title={descricaoConquista(c)}>
                  <Selo nome={nomeConquista(c)} cor={c.cor} tamanho={56} />
                  <span>{nomeConquista(c)}</span>
                </div>
              ))}
            </section>
          )}

          <div className={styles.abas} role="tablist">
            <button type="button" role="tab" aria-selected={aba === 'estante'} onClick={() => setAba('estante')}>
              {souEu ? t('social.perfil.estante') : t('social.perfil.estantePublica')} ({estante.length})
            </button>
            <button type="button" role="tab" aria-selected={aba === 'posts'} onClick={() => setAba('posts')}>
              {t('social.perfil.publicacoes')} ({posts.length})
            </button>
          </div>

          {aba === 'estante' ? (
            estante.length === 0 ? (
              <EstadoVazio
                titulo={souEu ? t('social.perfil.estanteVaziaEu') : t('social.perfil.estanteVaziaOutro')}
                mensagem={souEu ? t('social.perfil.estanteVaziaEuTexto') : t('social.perfil.estanteVaziaOutroTexto')}
              />
            ) : (
              <div className={styles.estante}>
                {estante.map((item) => {
                  const conteudo = (
                    <>
                      <CapaMidia item={item} />
                      {souEu && !item.publico && <span className={styles.privado}>{t('social.perfil.privado')}</span>}
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
            <EstadoVazio titulo={t('social.perfil.nenhumaPublicacao')} />
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
        titulo={t('social.perfil.bloquearTitulo', { nome: usuario.nome })}
        mensagem={t('social.perfil.bloquearTexto')}
        textoConfirmar={t('social.perfil.bloquear')}
        perigo
        aoConfirmar={bloquear}
        aoFechar={() => setConfirmandoBloqueio(false)}
      />
    </>
  );
}
