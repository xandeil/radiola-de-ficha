import { usePlayer } from '@/contexts/PlayerContext';
import Icone from '@/components/ui/Icone';
import { formatarDuracao } from '@/utils/formatadores';
import { useT } from '@/contexts/I18nContext';
import styles from './Controles.module.css';

/*
 * RF025 – Controles de reprodução. Usado na página da vitrola e no mini player
 * (compacto=true esconde aleatório/repetir para caber no rodapé).
 */

export function BarraProgresso({ compacta = false }) {
  const { progresso, duracao, buscar, atual } = usePlayer();
  const t = useT();
  return (
    <div className={`${styles.progresso} ${compacta ? styles.progressoCompacto : ''}`}>
      {!compacta && <span className={styles.tempo}>{formatarDuracao(progresso)}</span>}
      <input
        type="range"
        className={styles.trilho}
        min="0"
        max={duracao || 1}
        step="1"
        value={Math.min(progresso, duracao || 0)}
        onChange={(e) => buscar(Number(e.target.value))}
        disabled={!atual}
        aria-label={t('player.posicao')}
        aria-valuetext={t('player.posicaoValor', { atual: formatarDuracao(progresso), total: formatarDuracao(duracao) })}
        style={{ '--preenchido': `${duracao ? (progresso / duracao) * 100 : 0}%` }}
      />
      {!compacta && <span className={styles.tempo}>{formatarDuracao(duracao)}</span>}
    </div>
  );
}

export function ControleVolume() {
  const { volume, setVolume } = usePlayer();
  const t = useT();
  return (
    <div className={styles.volume}>
      <button type="button" className={styles.icone} onClick={() => setVolume(volume > 0 ? 0 : 0.8)} aria-label={volume > 0 ? t('player.silenciar') : t('player.ativarSom')}>
        <Icone nome={volume > 0 ? 'volume' : 'mudo'} />
      </button>
      <input
        type="range"
        className={styles.trilho}
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label={t('player.volume')}
        style={{ '--preenchido': `${volume * 100}%` }}
      />
    </div>
  );
}

export default function Controles({ compacto = false }) {
  const { atual, tocando, alternar, proxima, anterior, aleatorio, alternarAleatorio, repetir, alternarRepetir } = usePlayer();

  const t = useT();
  const rotuloRepetir = t(`player.repetir.${repetir}`);

  return (
    <div className={styles.controles}>
      {!compacto && (
        <button type="button" className={`${styles.icone} ${aleatorio ? styles.ativo : ''}`} onClick={alternarAleatorio} aria-pressed={aleatorio} aria-label={t('player.aleatorio')}>
          <Icone nome="aleatorio" />
        </button>
      )}
      <button type="button" className={styles.icone} onClick={anterior} disabled={!atual} aria-label={t('player.anterior')}>
        <Icone nome="anterior" />
      </button>
      <button type="button" className={`${styles.play} ${compacto ? styles.playCompacto : ''}`} onClick={alternar} disabled={!atual} aria-label={tocando ? t('player.pausar') : t('player.tocar')}>
        <Icone nome={tocando ? 'pause' : 'play'} tamanho={compacto ? 18 : 24} />
      </button>
      <button type="button" className={styles.icone} onClick={proxima} disabled={!atual} aria-label={t('player.proxima')}>
        <Icone nome="proxima" />
      </button>
      {!compacto && (
        <button type="button" className={`${styles.icone} ${repetir !== 'off' ? styles.ativo : ''}`} onClick={alternarRepetir} aria-label={rotuloRepetir} title={rotuloRepetir}>
          <Icone nome="repetir" />
          {repetir === 'uma' && <span className={styles.um}>1</span>}
        </button>
      )}
    </div>
  );
}
