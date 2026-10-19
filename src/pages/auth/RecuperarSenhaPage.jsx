import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import * as validar from '@/utils/validadores';
import styles from './Auth.module.css';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const mensagem = validar.obrigatorio(email, 'E-mail') || validar.email(email);
    setErro(mensagem || '');
    if (mensagem) return;

    setEnviando(true);
    await authService.solicitarRecuperacao(email).catch(() => null);
    setEnviando(false);
    setEnviado(true);
  };

  return (
    <>
      <h1 className={styles.titulo}>Recuperar senha</h1>
      <p className={styles.subtitulo}>Enviaremos um link para você criar uma nova senha.</p>

      {enviado ? (
        // Mesma mensagem exista ou não o e-mail: não damos pista para quem tenta descobrir contas
        <Alerta tipo="sucesso" titulo="Verifique seu e-mail">
          Se existir uma conta com {email}, você receberá o link em alguns minutos.
        </Alerta>
      ) : (
        <form className={styles.form} onSubmit={enviar} noValidate>
          <Entrada rotulo="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
          <Botao type="submit" tamanho="grande" carregando={enviando}>
            Enviar link
          </Botao>
        </form>
      )}

      <p className={styles.rodape}>
        <Link to="/login">Voltar para o login</Link>
      </p>
    </>
  );
}
