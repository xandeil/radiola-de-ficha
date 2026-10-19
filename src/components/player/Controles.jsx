import { usePlayer } from '@/contexts/PlayerContext';
import Icone from '@/components/ui/Icone';
import { formatarDuracao } from '@/utils/formatadores';
import styles from './Controles.module.css';

/*
 * RF025 – Controles de reprodução. Usado na página da vitrola e no mini player
 * (compacto=true esconde aleatório/repetir para caber no rodapé).
 */

export function BarraProgresso({ compacta = false }) {
  const { progresso, duracao, buscar, atual } = usePlayer();
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
        aria-label="Posição da música"
        aria-valuetext={`${formatarDuracao(progresso)} de ${formatarDuracao(duracao)}`}
        style={{ '--preenchido': `${duracao ? (progresso / duracao) * 100 : 0}%` }}
      />
      {!compacta && <span className={styles.tempo}>{formatarDuracao(duracao)}</span>}
    </div>
  );
}

export function ControleVolume() {
  const { volume, setVolume } = usePlayer();
  return (
    <div className={styles.volume}>
      <button type="button" className={styles.icone} onClick={() => setVolume(volume > 0 ? 0 : 0.8)} aria-label={volume > 0 ? 'Silenciar' : 'Ativar som'}>
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
        aria-label="Volume"
        style={{ '--preenchido': `${volume * 100}%` }}
      />
    </div>
  );
}

export default function Controles({ compacto = false }) {
  const { atual, tocando, alternar, proxima, anterior, aleatorio, alternarAleatorio, repetir, alternarRepetir } = usePlayer();

  const rotuloRepetir = { off: 'Repetir: desligado', todas: 'Repetir: todas', uma: 'Repetir: esta faixa' }[repetir];

  return (
    <div className={styles.controles}>
      {!compacto && (
        <button type="button" className={`${styles.icone} ${aleatorio ? styles.ativo : ''}`} onClick={alternarAleatorio} aria-pressed={aleatorio} aria-label="Aleatório">
          <Icone nome="aleatorio" />
        </button>
      )}
      <button type="button" className={styles.icone} onClick={anterior} disabled={!atual} aria-label="Anterior">
        <Icone nome="anterior" />
      </button>
      <button type="button" className={`${styles.play} ${compacto ? styles.playCompacto : ''}`} onClick={alternar} disabled={!atual} aria-label={tocando ? 'Pausar' : 'Tocar'}>
        <Icone nome={tocando ? 'pause' : 'play'} tamanho={compacto ? 18 : 24} />
      </button>
      <button type="button" className={styles.icone} onClick={proxima} disabled={!atual} aria-label="Próxima">
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
