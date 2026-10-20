import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStreaming } from '@/contexts/StreamingContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTema } from '@/hooks/useTema';
import { usePerfilLayout } from '@/hooks/usePerfilLayout';
import { redirectUri } from '@/services/streaming/spotifyAuth';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import { AreaTexto, Caixa, Entrada } from '@/components/ui/Campo';
import { useToast } from '@/contexts/ToastContext';
import * as validar from '@/utils/validadores';
import SecaoBackup from './SecaoBackup';
import Icone from '@/components/ui/Icone';
import BotaoInstalarApp from '@/components/pwa/BotaoInstalarApp';
import { PERFIS_LAYOUT } from '@/utils/constantes';
import { ehEquipe } from '@/utils/permissoes';
import styles from './ConfiguracoesPage.module.css';

/*
 * Configurações da conta: perfil, streaming (RF021), aparência e idioma
 * (RNF019, RF035, RNF020), backup e sessão.
 * No documento isso se divide em várias telas (/configuracoes/streaming,
 * /configuracoes/layout...). Aqui cabe tudo numa só, em seções.
 */

const TEMAS = ['auto', 'light', 'dark'];

/** RF057 – Dados do perfil público. O apelido vira o endereço /perfil/apelido. */
function PerfilPublico() {
  const { usuario, atualizarPerfil } = useAuth();
  const { t } = useI18n();
  const { mostrar } = useToast();
  const [form, setForm] = useState({ nome: usuario?.nome || '', apelido: usuario?.apelido || '', bio: usuario?.bio || '' });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const salvar = async (e) => {
    e.preventDefault();
    const novos = validar.limparErros({
      nome: validar.obrigatorio(form.nome, t('config.perfil.nome')),
      apelido: /^[a-z0-9]{3,20}$/.test(form.apelido) ? null : t('config.perfil.apelidoInvalido'),
    });
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await atualizarPerfil(form);
      mostrar(t('config.perfil.salvo'));
    } catch (err) {
      setErros({ apelido: err.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className={styles.secao}>
      <h2>{t('config.perfil.titulo')}</h2>
      <p className={styles.descricao}>
        {t('config.perfil.descricao')} <Link to={`/perfil/${usuario?.apelido}`}>/perfil/{usuario?.apelido}</Link>.
      </p>
      <form className={styles.formPerfil} onSubmit={salvar} noValidate>
        <Entrada rotulo={t('config.perfil.nome')} value={form.nome} onChange={mudar('nome')} erro={erros.nome} />
        <Entrada
          rotulo={t('config.perfil.apelido')}
          value={form.apelido}
          onChange={(e) => setForm({ ...form, apelido: e.target.value.toLowerCase() })}
          erro={erros.apelido}
          dica={t('config.perfil.apelidoDica')}
        />
        <AreaTexto className={styles.largo} rotulo={t('config.perfil.bio')} placeholder={t('config.perfil.bioPlaceholder')} value={form.bio} onChange={mudar('bio')} maxLength={280} />
        <div className={styles.largo}>
          <Botao type="submit" variante="secundario" carregando={salvando}>{t('config.perfil.salvar')}</Botao>
        </div>
      </form>
    </section>
  );
}

/** RF021 – Spotify, Deezer e Apple Music, na ordem de preferência do fallback. */
function SecaoStreaming() {
  const { t } = useI18n();
  const { servicos, erro, fallback, setFallback, conectar, desconectar, moverNaOrdem } = useStreaming();

  const descricaoDe = (s) => {
    if (!s.conectado) return t('config.streaming.naoConectado');
    if (s.id === 'spotify') {
      if (!s.perfil) return '...';
      return t('config.streaming.conectadoComo', { nome: s.perfil.nome }) + (s.perfil.premium || s.modoDemo ? '' : ` · ${t('config.streaming.spotifyFree')}`);
    }
    if (s.perfil && !s.perfil.publico) {
      return s.id === 'apple' ? t('config.streaming.appleConta') : t('config.streaming.conectadoComo', { nome: s.perfil.nome });
    }
    return t('config.streaming.publico');
  };

  return (
    <section className={styles.secao} id="streaming">
      <h2>{t('config.streaming.titulo')}</h2>
      <p className={styles.descricao}>{t('config.streaming.descricao')}</p>

      <ol className={styles.listaServicos}>
        {servicos.map((s, i) => (
          <li key={s.id} className={styles.servico}>
            <span className={styles.ordem} aria-hidden="true">{i + 1}</span>
            <span className={styles.logoServico} style={{ background: s.cor }} aria-hidden="true">
              <Icone nome="disco" />
            </span>
            <div className={styles.servicoInfo}>
              <strong>
                {s.nome}
                {s.modoDemo && ` (${t('config.streaming.demonstracao')})`}
              </strong>
              <span>{descricaoDe(s)}</span>
            </div>
            <div className={styles.setas}>
              <button type="button" onClick={() => moverNaOrdem(s.id, -1)} disabled={i === 0} aria-label={t('config.streaming.subir', { servico: s.nome })}>
                <Icone nome="cima" tamanho={16} />
              </button>
              <button type="button" onClick={() => moverNaOrdem(s.id, 1)} disabled={i === servicos.length - 1} aria-label={t('config.streaming.descer', { servico: s.nome })}>
                <Icone nome="baixo" tamanho={16} />
              </button>
            </div>
            {s.conectado ? (
              <Botao variante="secundario" onClick={() => desconectar(s.id)} aria-label={`${t('config.streaming.desconectar')} ${s.nome}`}>
                {t('config.streaming.desconectar')}
              </Botao>
            ) : (
              <Botao onClick={() => conectar(s.id)} aria-label={`${t('config.streaming.conectar')} ${s.nome}`}>
                {t('config.streaming.conectar')}
              </Botao>
            )}
          </li>
        ))}
        <li className={`${styles.servico} ${styles.desativado}`}>
          <span className={styles.ordem} aria-hidden="true" />
          <span className={styles.logoServico} aria-hidden="true">
            <Icone nome="disco" />
          </span>
          <div className={styles.servicoInfo}>
            <strong>{t('config.streaming.amazon')}</strong>
            <span>{t('config.streaming.amazonNota')}</span>
          </div>
        </li>
      </ol>
      <p className={styles.dicaOrdem}>{t('config.streaming.ordem')}</p>

      {erro && (
        <div className={styles.alerta}>
          <Alerta tipo="erro">{erro.message}</Alerta>
        </div>
      )}

      {servicos.find((s) => s.id === 'spotify')?.modoDemo && (
        <p className={styles.nota}>
          {t('config.streaming.notaSpotify')} <code>{redirectUri()}</code>.
          {window.location.hostname === 'localhost' && <> {t('config.streaming.localhost')}</>}
        </p>
      )}
      <p className={styles.nota}>{t('config.streaming.notaDeezer')}</p>

      <div className={styles.opcao}>
        <Caixa rotulo={t('config.streaming.fallback')} checked={fallback} onChange={(e) => setFallback(e.target.checked)} />
      </div>
    </section>
  );
}

export default function ConfiguracoesPage() {
  const { usuario, logout, atualizarPreferencias } = useAuth();
  const { t, idioma, setIdioma, idiomas } = useI18n();
  const { servicos } = useStreaming();
  const { tema, setTema } = useTema();
  const { perfil, setPerfil, bloqueado } = usePerfilLayout();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const recemConectado = servicos.find((s) => s.id === params.get('conectado') && s.conectado);

  const sair = () => {
    logout();
    navegar('/login', { replace: true });
  };

  const trocarIdioma = (codigo) => {
    setIdioma(codigo);
    // Também salva no perfil (coluna idioma_preferido): vale em qualquer aparelho
    atualizarPreferencias?.({ idioma_preferido: codigo }).catch(() => {});
  };

  return (
    <>
      <TituloPagina titulo={t('config.titulo')} subtitulo={usuario?.email} />

      {recemConectado && (
        <div className={styles.alerta}>
          <Alerta tipo="sucesso" titulo={t('config.conectadoServico', { servico: recemConectado.nome })}>
            {t('config.conectadoTexto')}
          </Alerta>
        </div>
      )}

      <PerfilPublico />

      <SecaoStreaming />

      <section className={styles.secao}>
        <h2>{t('config.aparencia.titulo')}</h2>
        <p className={styles.descricao}>{t('config.aparencia.descricao')}</p>

        <span className={styles.rotulo}>{t('comum.idioma')}</span>
        <div className={styles.pilulas} role="radiogroup" aria-label={t('comum.idioma')}>
          {idiomas.map((i) => (
            <button key={i.codigo} type="button" role="radio" aria-checked={idioma === i.codigo} lang={i.codigo} onClick={() => trocarIdioma(i.codigo)}>
              {i.nome}
            </button>
          ))}
        </div>
        <p className={styles.dicaOrdem}>{t('config.aparencia.idiomaDica')}</p>

        <span className={styles.rotulo}>{t('config.aparencia.tema')}</span>
        <div className={styles.pilulas} role="radiogroup" aria-label={t('config.aparencia.tema')}>
          {TEMAS.map((valor) => (
            <button key={valor} type="button" role="radio" aria-checked={tema === valor} onClick={() => setTema(valor)}>
              {t(`config.aparencia.temas.${valor}`)}
            </button>
          ))}
        </div>

        <span className={styles.rotulo}>{t('config.aparencia.perfilPlayer')}</span>
        <div className={styles.pilulas} role="radiogroup" aria-label={t('config.aparencia.perfilPlayer')}>
          {PERFIS_LAYOUT.map((p) => (
            <button
              key={p.valor}
              type="button"
              role="radio"
              aria-checked={perfil === p.valor}
              disabled={!p.disponivel}
              onClick={() => (bloqueado(p.valor) ? navegar('/planos') : setPerfil(p.valor))}
            >
              {t(`perfis.${p.valor}`)}
              {!p.disponivel && <small> · {t('perfis.emBreve')}</small>}
              {p.disponivel && bloqueado(p.valor) && <small> · 🔒 Premium</small>}
            </button>
          ))}
        </div>
      </section>

      <SecaoBackup />

      <section className={styles.secao}>
        <h2>{t('config.conta.titulo')}</h2>
        <p className={styles.descricao}>
          {t('config.conta.planoAtual', { plano: usuario?.plano === 'gratuito' ? t('config.conta.gratuito') : t('config.conta.premium') })}{' '}
          <Link to="/assinatura">{t('config.conta.gerenciar')}</Link> · <Link to="/suporte">{t('config.conta.ajuda')}</Link>
          {ehEquipe(usuario) && (
            <>
              {' · '}
              <Link to="/admin">{t('config.conta.admin')}</Link>
            </>
          )}
        </p>
        <div className={styles.linhaBotoes}>
          <BotaoInstalarApp />
          <Botao variante="secundario" icone={<Icone nome="sair" />} onClick={sair}>
            {t('config.conta.sair')}
          </Botao>
        </div>
      </section>
    </>
  );
}
