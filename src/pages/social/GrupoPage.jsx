import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useToast } from '@/contexts/ToastContext';
import { socialService } from '@/services/socialService';
import Avatar from '@/components/social/Avatar';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { AreaTexto, Entrada } from '@/components/ui/Campo';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Grupos.module.css';
import { useT } from '@/contexts/I18nContext';

/** RF073–RF076 – Página de um grupo: tópicos, membros, entrar/sair. */
export default function GrupoPage() {
  const t = useT();
  const { id } = useParams();
  const { mostrar } = useToast();
  const grupo = useCarregar(() => socialService.grupo(id), [id]);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (grupo.carregando && !grupo.dados) return <Carregando />;
  if (grupo.erro) return <EstadoErro erro={grupo.erro} />;
  const g = grupo.dados;

  const acao = async (fn, mensagem) => {
    setOcupado(true);
    try {
      await fn();
      if (mensagem) mostrar(mensagem);
      grupo.recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setOcupado(false);
    }
  };

  const publicar = (e) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return mostrar(t('social.grupo.preencha'), { tipo: 'erro' });
    acao(async () => {
      await socialService.postarNoGrupo(g.id, { titulo, conteudo });
      setTitulo('');
      setConteudo('');
    }, t('social.grupo.publicado'));
  };

  return (
    <>
      <Link to="/grupos" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} /> {t('social.grupo.voltar')}
      </Link>

      <header className={styles.capaGrupo} style={{ '--cor-grupo': g.cor }}>
        <div>
          <span className={styles.categoria}>{t(`social.grupos.cat.${g.categoria}`)}</span>
          <h1>{g.nome}</h1>
          <p>{g.descricao}</p>
          <span className={styles.membros}>{t('social.grupos.membros', { count: g.membros.length })}</span>
        </div>
        {g.sou_membro ? (
          <Botao variante="secundario" carregando={ocupado} onClick={() => acao(() => socialService.sairDoGrupo(g.id), t('social.grupo.saiu', { nome: g.nome }))}>
            {t('social.grupo.sair')}
          </Botao>
        ) : (
          <Botao carregando={ocupado} onClick={() => acao(() => socialService.entrarNoGrupo(g.id), t('social.grupo.bemVindo', { nome: g.nome }))}>
            {t('social.grupo.participar')}
          </Botao>
        )}
      </header>

      <div className={styles.colunasGrupo}>
        <div>
          {g.sou_membro && (
            <form className={styles.novoTopico} onSubmit={publicar} noValidate>
              <Entrada aria-label={t('social.grupo.tituloTopico')} placeholder={t('social.grupo.tituloTopico')} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
              <AreaTexto aria-label={t('social.grupo.mensagem')} placeholder={t('social.grupo.mensagemPh')} value={conteudo} onChange={(e) => setConteudo(e.target.value)} maxLength={3000} />
              <div className={styles.acoesModal}>
                <Botao type="submit" carregando={ocupado}>{t('social.grupo.publicar')}</Botao>
              </div>
            </form>
          )}

          {g.posts.length === 0 ? (
            <EstadoVazio titulo={t('social.grupo.nenhumTopico')} mensagem={g.sou_membro ? t('social.grupo.abra') : t('social.grupo.participePara')} />
          ) : (
            <div className={styles.topicos}>
              {g.posts.map((p) => (
                <article key={p.id} className={styles.topico}>
                  <header>
                    <Avatar usuario={p.autor} tamanho={32} />
                    <div>
                      <Link to={`/perfil/${p.autor?.apelido}`}>{p.autor?.nome}</Link>
                      <small> · {tempoRelativo(p.data_publicacao)}</small>
                    </div>
                  </header>
                  <h2>{p.titulo}</h2>
                  <p>{p.conteudo}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.cartaoMembros}>
          <h2>{t('social.grupo.membros')}</h2>
          <ul>
            {g.membros.map((m) => (
              <li key={m.id}>
                <Avatar usuario={m} tamanho={30} />
                <Link to={`/perfil/${m.apelido}`}>{m.nome}</Link>
                {m.funcao !== 'membro' && <span className={styles.funcao}>{t(`social.grupo.funcao.${m.funcao}`)}</span>}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
