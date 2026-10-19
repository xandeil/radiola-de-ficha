import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useManutencao } from '@/contexts/ManutencaoContext';
import { manutencaoService } from '@/services/manutencaoService';
import styles from './ManutencaoPage.module.css';

/*
 * Página pública de manutenção (RF104, Anexo 2 seção 16.4).
 * - Título e mensagem personalizáveis pelo admin.
 * - Contagem regressiva e barra de progresso até o fim previsto.
 * - Recarrega o status sozinha a cada 60s (feito pelo ManutencaoContext):
 *   quando o sistema volta, o portão some e o app reaparece sem F5.
 * - previa=true: o admin vê como a página fica, mesmo sem manutenção ligada.
 */

function partes(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const dois = (n) => String(n).padStart(2, '0');

export default function ManutencaoPage({ previa = false }) {
  const { status, atualizar } = useManutencao();
  const { autenticado, logout } = useAuth();
  const [config, setConfig] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const [verificando, setVerificando] = useState(false);

  // Na prévia lemos a config (textos novos) direto; o status pode estar "no ar".
  useEffect(() => {
    if (previa) manutencaoService.config().then(setConfig).catch(() => {});
  }, [previa]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const dados = previa && config
    ? { titulo: config.titulo_personalizado, mensagem: config.mensagem_personalizada, motivo: config.motivo_publico, inicio: new Date(Date.now() - 20 * 60000).toISOString(), fim_previsto: new Date(Date.now() + 40 * 60000).toISOString() }
    : status || {};

  const inicio = dados.inicio ? new Date(dados.inicio).getTime() : null;
  const fim = dados.fim_previsto ? new Date(dados.fim_previsto).getTime() : null;
  const falta = fim ? partes(fim - agora) : null;
  const progresso = inicio && fim ? Math.min(100, Math.max(0, ((agora - inicio) / (fim - inicio)) * 100)) : null;
  const passou = fim && agora >= fim;

  const verificarAgora = async () => {
    setVerificando(true);
    await atualizar(true);
    setVerificando(false);
  };

  return (
    <main className={styles.pagina}>
      {previa && (
        <p className={styles.faixaPrevia}>
          Prévia da página de manutenção · <Link to="/admin/manutencao">voltar ao painel</Link>
        </p>
      )}
      <div className={styles.cartao}>
        <div className={styles.vitrola} aria-hidden="true">
          <span className={styles.disco} />
          <span className={styles.braco} />
        </div>

        <h1>{dados.titulo || 'Radiola em Manutenção'}</h1>
        <p className={styles.mensagem}>{dados.mensagem}</p>
        {dados.motivo && <p className={styles.motivo}>Motivo: {dados.motivo}</p>}

        {fim && !passou && (
          <div className={styles.contagem} role="timer" aria-live="off">
            <span>Previsão de volta em</span>
            <strong>
              {falta.h > 0 && `${dois(falta.h)}:`}
              {dois(falta.m)}:{dois(falta.s)}
            </strong>
            <small>às {new Date(fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        )}
        {passou && <p className={styles.motivo}>Estamos quase lá — finalizando os últimos ajustes.</p>}
        {!fim && <p className={styles.motivo}>Ainda sem previsão de volta. Esta página se atualiza sozinha.</p>}

        {progresso !== null && (
          <div className={styles.progresso} role="progressbar" aria-label="Andamento da manutenção" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso)}>
            <span style={{ width: `${progresso}%` }} />
          </div>
        )}

        <div className={styles.acoes}>
          <button type="button" onClick={verificarAgora} disabled={verificando || previa}>
            {verificando ? 'Verificando…' : 'Verificar de novo'}
          </button>
        </div>

        <p className={styles.rodape}>
          Apenas administradores têm acesso durante a manutenção.{' '}
          {autenticado ? (
            <button type="button" className={styles.link} onClick={logout}>Entrar com outra conta</button>
          ) : (
            <Link to="/login">Sou da equipe</Link>
          )}
        </p>
      </div>
    </main>
  );
}
