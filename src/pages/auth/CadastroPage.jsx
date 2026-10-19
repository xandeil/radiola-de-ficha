import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import * as validar from '@/utils/validadores';
import styles from './Auth.module.css';

/** Mede quantos dos 4 critérios do RNF022 a senha cumpre, para o indicador visual. */
function forcaSenha(senha) {
  return [senha.length >= 8, /[a-zA-Z]/.test(senha), /\d/.test(senha), /[^a-zA-Z0-9]/.test(senha)].filter(Boolean).length;
}

export default function CadastroPage() {
  const { registrar } = useAuth();
  const navegar = useNavigate();

  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmacao: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    const novosErros = validar.limparErros({
      nome: validar.obrigatorio(form.nome, 'Nome'),
      email: validar.obrigatorio(form.email, 'E-mail') || validar.email(form.email),
      senha: validar.senhaForte(form.senha),
      confirmacao: form.senha !== form.confirmacao ? 'As senhas não conferem' : null,
    });
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setEnviando(true);
    setErroGeral('');
    try {
      await registrar(form);
      navegar('/dashboard', { replace: true });
    } catch (erro) {
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  const forca = forcaSenha(form.senha);

  return (
    <>
      <h1 className={styles.titulo}>Crie sua conta</h1>
      <p className={styles.subtitulo}>Plano Radiola Básica: até 50 itens, grátis.</p>

      <form className={styles.form} onSubmit={enviar} noValidate>
        {erroGeral && <Alerta tipo="erro">{erroGeral}</Alerta>}
        <Entrada rotulo="Nome" autoComplete="name" value={form.nome} onChange={mudar('nome')} erro={erros.nome} />
        <Entrada rotulo="E-mail" type="email" autoComplete="email" value={form.email} onChange={mudar('email')} erro={erros.email} />
        <Entrada
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          value={form.senha}
          onChange={mudar('senha')}
          erro={erros.senha}
          dica="Mínimo 8 caracteres, com letra, número e símbolo"
        />
        <div className={styles.forca} aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= forca ? styles.ok : ''} />
          ))}
        </div>
        <Entrada rotulo="Confirmar senha" type="password" autoComplete="new-password" value={form.confirmacao} onChange={mudar('confirmacao')} erro={erros.confirmacao} />
        <Botao type="submit" tamanho="grande" carregando={enviando}>
          Criar conta
        </Botao>
      </form>

      <p className={styles.rodape}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </>
  );
}
