import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { USE_MOCK } from '@/services/api';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import * as validar from '@/utils/validadores';
import styles from './Auth.module.css';

export default function LoginPage() {
  const { login } = useAuth();
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
      email: validar.obrigatorio(form.email, 'E-mail') || validar.email(form.email),
      senha: validar.obrigatorio(form.senha, 'Senha'),
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
      <h1 className={styles.titulo}>Bem-vindo de volta</h1>
      <p className={styles.subtitulo}>Entre para ver sua coleção.</p>

      {/* noValidate: desliga a validação do navegador e usa a nossa, com mensagens em português */}
      <form className={styles.form} onSubmit={enviar} noValidate>
        {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
        <Entrada rotulo="E-mail" type="email" autoComplete="email" value={form.email} onChange={mudar('email')} erro={erros.email} />
        <Entrada rotulo="Senha" type="password" autoComplete="current-password" value={form.senha} onChange={mudar('senha')} erro={erros.senha} />
        <div className={styles.linha}>
          <span />
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
        </div>
        <Botao type="submit" tamanho="grande" carregando={enviando}>
          Entrar
        </Botao>
      </form>

      <p className={styles.rodape}>
        Ainda não tem conta? <Link to="/cadastro">Criar conta grátis</Link>
      </p>

      {USE_MOCK && (
        <p className={styles.demo}>
          Modo demonstração — use <code>demo@radiola.com</code> / <code>Demo@123</code>
        </p>
      )}
    </>
  );
}
