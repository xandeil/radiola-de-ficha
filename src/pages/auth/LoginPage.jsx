import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { USE_MOCK } from '@/services/api';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import * as validar from '@/utils/validadores';
import { useT } from '@/contexts/I18nContext';
import styles from './Auth.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const t = useT();
  const navegar = useNavigate();
  const local = useLocation();

  const [form, setForm] = useState({ email: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Uma função que devolve outra: mudar('email') cria o onChange do campo email.
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault(); // impede o recarregamento padrão do <form>
    const novosErros = validar.limparErros({
      email: validar.obrigatorio(form.email, t('auth.email')) || validar.email(form.email),
      senha: validar.obrigatorio(form.senha, t('auth.senha')),
    });
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setEnviando(true);
    setErroGeral('');
    try {
      await login(form.email, form.senha);
      navegar(local.state?.de || '/dashboard', { replace: true });
    } catch (erro) {
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <h1 className={styles.titulo}>{t('auth.login.titulo')}</h1>
      <p className={styles.subtitulo}>{t('auth.login.subtitulo')}</p>

      {/* noValidate: desliga a validação do navegador e usa a nossa, com mensagens no idioma escolhido */}
      <form className={styles.form} onSubmit={enviar} noValidate>
        {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
        <Entrada rotulo={t('auth.email')} type="email" autoComplete="email" value={form.email} onChange={mudar('email')} erro={erros.email} />
        <Entrada rotulo={t('auth.senha')} type="password" autoComplete="current-password" value={form.senha} onChange={mudar('senha')} erro={erros.senha} />
        <div className={styles.linha}>
          <span />
          <Link to="/recuperar-senha">{t('auth.login.esqueci')}</Link>
        </div>
        <Botao type="submit" tamanho="grande" carregando={enviando}>
          {t('auth.login.entrar')}
        </Botao>
      </form>

      <p className={styles.rodape}>
        {t('auth.login.semConta')} <Link to="/cadastro">{t('auth.login.criarGratis')}</Link>
      </p>

      {USE_MOCK && (
        <p className={styles.demo}>
          {t('auth.login.demo')} <code>demo@radiola.com</code> / <code>Demo@123</code>
        </p>
      )}
    </>
  );
}
