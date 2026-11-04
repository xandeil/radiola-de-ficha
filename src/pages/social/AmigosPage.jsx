import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useDebounce } from '@/hooks/useDebounce';
import { useConquistas } from '@/hooks/useConquistas';
import { useToast } from '@/contexts/ToastContext';
import { socialService } from '@/services/socialService';
import TituloPagina from '@/components/ui/TituloPagina';
import NavSocial from '@/components/social/NavSocial';
import Avatar from '@/components/social/Avatar';
import BotaoAmizade from '@/components/social/BotaoAmizade';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import * as validar from '@/utils/validadores';
import styles from './Social.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF058–RF061 – Amigos: pedidos recebidos, amigos, pedidos enviados,
 * bloqueados, busca de pessoas e convite.
 *
 * Toda ação chama recarregar() das duas listas. Num app maior usaríamos
 * uma biblioteca de cache (React Query / TanStack Query) que faz isso
 * sozinha — vale estudar quando o projeto crescer.
 */

function Pessoa({ usuario, relacao, aoMudar, detalhe }) {
  return (
    <div className={styles.pessoa}>
      <Avatar usuario={usuario} />
      <div className={styles.pessoaInfo}>
        <Link to={`/perfil/${usuario.apelido}`}>{usuario.nome}</Link>
        <span>{detalhe || usuario.bio || `@${usuario.apelido}`}</span>
      </div>
      <div className={styles.pessoaAcoes}>
        <BotaoAmizade usuario={usuario} relacao={relacao} aoMudar={aoMudar} tamanho="pequeno" />
      </div>
    </div>
  );
}

export default function AmigosPage() {
  const t = useT();
  const { mostrar } = useToast();
  const { verificar } = useConquistas();
  const amizades = useCarregar(() => socialService.amizades(), []);
  const [termo, setTermo] = useState('');
  const termoAtrasado = useDebounce(termo);
  const busca = useCarregar(() => socialService.buscarUsuarios(termoAtrasado), [termoAtrasado]);
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [link, setLink] = useState('');
  const [convidando, setConvidando] = useState(false);

  const recarregarTudo = () => {
    amizades.recarregar();
    busca.recarregar();
  };

  const convidar = async (e) => {
    e.preventDefault();
    const erro = email ? validar.email(email) : null;
    setErroEmail(erro || '');
    if (erro) return;
    setConvidando(true);
    const { link: novoLink } = await socialService.convidar(email);
    setLink(novoLink);
    setConvidando(false);
    mostrar(email ? t('social.amigos.conviteRegistrado', { email }) : t('social.amigos.linkGerado'));
    setEmail('');
    verificar(); // 5 convites = conquista "Social"
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      mostrar(t('social.amigos.linkCopiado'));
    } catch {
      mostrar(t('social.amigos.naoCopiou'), { tipo: 'erro' });
    }
  };

  const a = amizades.dados;

  return (
    <>
      <TituloPagina titulo={t('social.amigos.titulo')} subtitulo={t('social.amigos.subtitulo')} />
      <NavSocial />

      <div className={styles.duasColunas}>
        <section className={styles.cartao}>
          {amizades.carregando && !a ? (
            <Carregando />
          ) : amizades.erro ? (
            <EstadoErro erro={amizades.erro} aoTentarDeNovo={amizades.recarregar} />
          ) : (
            <>
              {a.recebidas.length > 0 && (
                <>
                  <h2 className={styles.secaoTitulo}>{t('social.amigos.recebidos')}</h2>
                  {a.recebidas.map((r) => (
                    <Pessoa key={r.id_amizade} usuario={r.usuario} relacao={{ tipo: 'recebida', id_amizade: r.id_amizade }} aoMudar={recarregarTudo} />
                  ))}
                </>
              )}

              <h2 className={styles.secaoTitulo}>{t('social.amigos.seus', { n: a.amigos.length })}</h2>
              {a.amigos.length === 0 ? (
                <p className={styles.muted}>{t('social.amigos.ninguem')}</p>
              ) : (
                a.amigos.map((r) => (
                  <Pessoa key={r.id_amizade} usuario={r.usuario} relacao={{ tipo: 'amigos', id_amizade: r.id_amizade }} aoMudar={recarregarTudo} />
                ))
              )}

              {a.enviadas.length > 0 && (
                <>
                  <h2 className={styles.secaoTitulo}>{t('social.amigos.enviados')}</h2>
                  {a.enviadas.map((r) => (
                    <Pessoa key={r.id_amizade} usuario={r.usuario} relacao={{ tipo: 'enviada', id_amizade: r.id_amizade }} aoMudar={recarregarTudo} detalhe={t('social.amigos.aguardando')} />
                  ))}
                </>
              )}

              {a.bloqueados.length > 0 && (
                <>
                  <h2 className={styles.secaoTitulo}>{t('social.amigos.bloqueados')}</h2>
                  {a.bloqueados.map((r) => (
                    <Pessoa key={r.id_amizade} usuario={r.usuario} relacao={{ tipo: 'bloqueado', id_amizade: r.id_amizade }} aoMudar={recarregarTudo} />
                  ))}
                </>
              )}
            </>
          )}
        </section>

        <aside className={styles.lateral}>
          <section className={styles.cartao}>
            <h2>{t('social.amigos.buscar')}</h2>
            <Entrada type="search" aria-label={t('social.amigos.buscarAria')} placeholder={t('social.amigos.buscarPh')} value={termo} onChange={(e) => setTermo(e.target.value)} />
            {termoAtrasado.trim() &&
              (busca.carregando ? (
                <Carregando />
              ) : busca.dados?.length === 0 ? (
                <p className={styles.muted} style={{ marginTop: 10 }}>{t('social.amigos.ninguemEncontrado')}</p>
              ) : (
                busca.dados?.map((u) => <Pessoa key={u.id} usuario={u} relacao={u.relacao} aoMudar={recarregarTudo} />)
              ))}
          </section>

          <section className={styles.cartao}>
            <h2>{t('social.amigos.convidar')}</h2>
            <form className={styles.convite} onSubmit={convidar} noValidate>
              <Entrada type="email" rotulo={t('social.amigos.emailOpcional')} placeholder="amigo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} erro={erroEmail} />
              <Botao type="submit" variante="secundario" carregando={convidando}>
                {t('social.amigos.gerar')}
              </Botao>
            </form>
            {link && (
              <>
                <p className={styles.link}>{link}</p>
                <Botao tamanho="pequeno" variante="fantasma" onClick={copiar}>
                  {t('social.amigos.copiarLink')}
                </Botao>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
