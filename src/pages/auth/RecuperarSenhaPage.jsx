import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Entrada } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import * as validar from '@/utils/validadores';
import { useT } from '@/contexts/I18nContext';
import styles from './Auth.module.css';

export default function RecuperarSenhaPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const mensagem = validar.obrigatorio(email, t('auth.email')) || validar.email(email);
    setErro(mensagem || '');
    if (mensagem) return;

    setEnviando(true);
    await authService.solicitarRecuperacao(email).catch(() => null);
    setEnviando(false);
    setEnviado(true);
  };

  return (
    <>
      <h1 className={styles.titulo}>{t('auth.recuperar.titulo')}</h1>
      <p className={styles.subtitulo}>{t('auth.recuperar.subtitulo')}</p>

      {enviado ? (
        // Mesma mensagem exista ou não o e-mail: não damos pista para quem tenta descobrir contas
        <Alerta tipo="sucesso" titulo={t('auth.recuperar.verifique')}>
          {t('auth.recuperar.enviado', { email })}
        </Alerta>
      ) : (
        <form className={styles.form} onSubmit={enviar} noValidate>
          <Entrada rotulo={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
          <Botao type="submit" tamanho="grande" carregando={enviando}>
            {t('auth.recuperar.enviar')}
          </Botao>
        </form>
      )}

      <p className={styles.rodape}>
        <Link to="/login">{t('auth.recuperar.voltar')}</Link>
      </p>
    </>
  );
}
