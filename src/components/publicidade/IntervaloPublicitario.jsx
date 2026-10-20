import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { publicidadeService } from '@/services/publicidadeService';
import styles from './IntervaloPublicitario.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Vinheta (1 por sessão, antes da primeira música) e intersticial
 * (a cada 5 músicas) do plano gratuito — seção 8.1.
 *
 * A vinheta é "sonora": tocamos um jingle curtinho sintetizado com a
 * Web Audio API (duas notas), sem baixar arquivo nenhum.
 * O botão de continuar só libera depois da contagem — é o "preço" do gratuito,
 * mas curto (5 segundos) para continuar não intrusivo.
 */

const DURACAO = 5;

function jingle() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      const inicio = ctx.currentTime + i * 0.18;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.12, inicio + 0.03);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.35);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.4);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* sem áudio: segue só o visual */
  }
}

export default function IntervaloPublicitario() {
  const t = useT();
  const { intervalo, fecharIntervalo } = usePlayer();
  const [resta, setResta] = useState(DURACAO);

  useEffect(() => {
    if (!intervalo) return;
    setResta(DURACAO);
    if (intervalo.tipo === 'vinheta') jingle();
    const relogio = setInterval(() => setResta((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(relogio);
  }, [intervalo]);

  if (!intervalo) return null;
  const c = intervalo.campanha.conteudo_json;

  return (
    <div className={styles.fundo} role="dialog" aria-modal="true" aria-labelledby="intervalo-titulo">
      <div className={styles.janela} style={{ '--cor-ad': c.cor }}>
        <span className={styles.selo}>{intervalo.tipo === 'vinheta' ? t('anuncio.vinheta') : t('anuncio.intervalo')}</span>
        <h2 id="intervalo-titulo">{c.titulo}</h2>
        <p>{c.texto}</p>
        <a
          href={intervalo.campanha.url_destino}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className={styles.cta}
          onClick={() => publicidadeService.registrarClique(intervalo.idImpressao)}
        >
          {c.cta}
        </a>
        <div className={styles.barra} aria-hidden="true">
          <span style={{ width: `${((DURACAO - resta) / DURACAO) * 100}%` }} />
        </div>
        <div className={styles.rodape}>
          <Link to="/planos" onClick={fecharIntervalo}>{t('anuncio.semInterrupcoes')}</Link>
          <button type="button" onClick={fecharIntervalo} disabled={resta > 0} autoFocus={resta === 0}>
            {resta > 0 ? t('anuncio.continuarEm', { s: resta }) : t('anuncio.continuar')}
          </button>
        </div>
      </div>
    </div>
  );
}
