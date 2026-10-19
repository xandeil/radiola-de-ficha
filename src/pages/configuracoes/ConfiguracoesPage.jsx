import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStreaming } from '@/contexts/StreamingContext';
import { useTema } from '@/hooks/useTema';
import { usePerfilLayout } from '@/hooks/usePerfilLayout';
import { redirectUri } from '@/services/streaming/spotifyAuth';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import { AreaTexto, Caixa, Entrada } from '@/components/ui/Campo';
import { useToast } from '@/contexts/ToastContext';
import * as validar from '@/utils/validadores';
import Icone from '@/components/ui/Icone';
import { PERFIS_LAYOUT } from '@/utils/constantes';
import styles from './ConfiguracoesPage.module.css';

/*
 * Configurações da conta: streaming (RF021), aparência (RNF019, RF035) e sessão.
 * No documento isso se divide em várias telas (/configuracoes/streaming,
 * /configuracoes/layout...). Por enquanto cabe tudo numa só, em seções.
 */

const TEMAS = [
  { valor: 'auto', rotulo: 'Automático' },
  { valor: 'light', rotulo: 'Claro' },
  { valor: 'dark', rotulo: 'Escuro' },
];

/** RF057 – Dados do perfil público. O apelido vira o endereço /perfil/apelido. */
function PerfilPublico() {
  const { usuario, atualizarPerfil } = useAuth();
  const { mostrar } = useToast();
  const [form, setForm] = useState({ nome: usuario?.nome || '', apelido: usuario?.apelido || '', bio: usuario?.bio || '' });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const salvar = async (e) => {
    e.preventDefault();
    const novos = validar.limparErros({
      nome: validar.obrigatorio(form.nome, 'Nome'),
      apelido: /^[a-z0-9]{3,20}$/.test(form.apelido) ? null : 'De 3 a 20 letras minúsculas ou números, sem espaço',
    });
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await atualizarPerfil(form);
      mostrar('Perfil atualizado');
    } catch (err) {
      setErros({ apelido: err.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className={styles.secao}>
      <h2>Perfil público</h2>
      <p className={styles.descricao}>
        O que outros colecionadores veem em <Link to={`/perfil/${usuario?.apelido}`}>/perfil/{usuario?.apelido}</Link>.
      </p>
      <form className={styles.formPerfil} onSubmit={salvar} noValidate>
        <Entrada rotulo="Nome" value={form.nome} onChange={mudar('nome')} erro={erros.nome} />
        <Entrada rotulo="Apelido" value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value.toLowerCase() })} erro={erros.apelido} dica="Vira o endereço do seu perfil" />
        <AreaTexto className={styles.largo} rotulo="Bio musical" placeholder="O que você coleciona? O que não sai da sua vitrola?" value={form.bio} onChange={mudar('bio')} maxLength={280} />
        <div className={styles.largo}>
          <Botao type="submit" variante="secundario" carregando={salvando}>Salvar perfil</Botao>
        </div>
      </form>
    </section>
  );
}

export default function ConfiguracoesPage() {
  const { usuario, logout } = useAuth();
  const { spotify, erro, fallback, setFallback, conectar, desconectar } = useStreaming();
  const { tema, setTema } = useTema();
  const { perfil, setPerfil } = usePerfilLayout();
  const [params] = useSearchParams();
  const navegar = useNavigate();

  const sair = () => {
    logout();
    navegar('/login', { replace: true });
  };

  return (
    <>
      <TituloPagina titulo="Configurações" subtitulo={usuario?.email} />

      {params.get('conectado') === 'spotify' && spotify.conectado && (
        <div className={styles.alerta}>
          <Alerta tipo="sucesso" titulo="Spotify conectado">Agora a busca e a vitrola também usam sua conta.</Alerta>
        </div>
      )}

      <PerfilPublico />

      <section className={styles.secao}>
        <h2>Serviços de streaming</h2>
        <p className={styles.descricao}>
          Conecte sua própria conta para tocar o que não está digitalizado e buscar fora da sua coleção.
        </p>

        <div className={styles.servico}>
          <span className={styles.logoServico} style={{ background: '#1db954' }} aria-hidden="true">
            <Icone nome="disco" />
          </span>
          <div className={styles.servicoInfo}>
            <strong>Spotify{spotify.modoDemo && ' (demonstração)'}</strong>
            {spotify.conectado ? (
              <span>
                Conectado como {spotify.perfil?.nome || '...'}
                {spotify.perfil && !spotify.premium && ' · conta Free: a reprodução no navegador exige Premium'}
              </span>
            ) : (
              <span>Não conectado</span>
            )}
          </div>
          {spotify.conectado ? (
            <Botao variante="secundario" onClick={desconectar}>Desconectar</Botao>
          ) : (
            <Botao onClick={conectar}>Conectar</Botao>
          )}
        </div>

        {erro && !spotify.conectado && (
          <div className={styles.alerta}>
            <Alerta tipo="erro">{erro.message}</Alerta>
          </div>
        )}

        {spotify.modoDemo && (
          <p className={styles.nota}>
            Sem <code>VITE_SPOTIFY_CLIENT_ID</code> no <code>.env</code>, o app usa um catálogo de demonstração.
            Para a conta real, crie um app em developer.spotify.com e cadastre o Redirect URI <code>{redirectUri()}</code>.
            {window.location.hostname === 'localhost' && (
              <> O Spotify não aceita "localhost": abra o app por <code>127.0.0.1</code> no lugar.</>
            )}
          </p>
        )}

        {['Deezer', 'Apple Music', 'Amazon Music'].map((nome) => (
          <div key={nome} className={`${styles.servico} ${styles.desativado}`}>
            <span className={styles.logoServico} aria-hidden="true">
              <Icone nome="disco" />
            </span>
            <div className={styles.servicoInfo}>
              <strong>{nome}</strong>
              <span>Chega na Fase 6</span>
            </div>
          </div>
        ))}

        <div className={styles.opcao}>
          <Caixa
            rotulo="Tocar pelo streaming quando a faixa do disco não tiver arquivo digitalizado"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />
        </div>
      </section>

      <section className={styles.secao}>
        <h2>Aparência</h2>
        <p className={styles.descricao}>Tema da interface e visual do player.</p>

        <span className={styles.rotulo}>Tema</span>
        <div className={styles.pilulas} role="radiogroup" aria-label="Tema">
          {TEMAS.map((t) => (
            <button key={t.valor} type="button" role="radio" aria-checked={tema === t.valor} onClick={() => setTema(t.valor)}>
              {t.rotulo}
            </button>
          ))}
        </div>

        <span className={styles.rotulo}>Perfil do player</span>
        <div className={styles.pilulas} role="radiogroup" aria-label="Perfil do player">
          {PERFIS_LAYOUT.map((p) => (
            <button key={p.valor} type="button" role="radio" aria-checked={perfil === p.valor} disabled={!p.disponivel} onClick={() => setPerfil(p.valor)}>
              {p.rotulo}
              {!p.disponivel && <small> · {p.fase}</small>}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.secao}>
        <h2>Conta</h2>
        <p className={styles.descricao}>Plano atual: {usuario?.plano === 'gratuito' ? 'Radiola Básica (gratuito)' : 'Premium'}.</p>
        <Botao variante="secundario" icone={<Icone nome="sair" />} onClick={sair}>
          Sair da conta
        </Botao>
      </section>
    </>
  );
}
