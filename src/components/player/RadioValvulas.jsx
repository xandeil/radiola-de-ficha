import { useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import styles from './RadioValvulas.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF036 – Perfil "Rádio de Válvulas".
 *
 * - O visor tem uma escala de frequências; o ponteiro anda conforme a
 *   música progride (como se você estivesse "sintonizando" a faixa).
 * - As válvulas precisam "esquentar": a luz do visor acende com atraso
 *   (transition-delay no CSS), como num rádio de verdade.
 * - O "olho mágico" verde pulsa enquanto toca.
 * - O botão de volume gira: arraste para cima/baixo ou use as setas do teclado.
 */

const ESCALA = [88, 92, 96, 100, 104, 108];

function BotaoGiratorio({ rotulo, valor, aoMudar, passo = 0.05 }) {
  const arraste = useRef(null);
  const angulo = -135 + valor * 270; // de -135° (mínimo) a +135° (máximo)

  const limitar = (v) => Math.max(0, Math.min(1, v));

  const aoPressionar = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId); // continua recebendo o movimento fora do botão
    arraste.current = { y: e.clientY, inicial: valor };
  };
  const aoMover = (e) => {
    if (!arraste.current) return;
    const delta = (arraste.current.y - e.clientY) / 150; // 150px = curso completo
    aoMudar(limitar(arraste.current.inicial + delta));
  };
  const aoSoltar = () => {
    arraste.current = null;
  };
  const aoTeclar = (e) => {
    const mapa = { ArrowUp: passo, ArrowRight: passo, ArrowDown: -passo, ArrowLeft: -passo, Home: -1, End: 1 };
    if (mapa[e.key] === undefined) return;
    e.preventDefault();
    aoMudar(limitar(valor + mapa[e.key]));
  };

  return (
    <div className={styles.controle}>
      <div
        className={styles.botao}
        role="slider"
        tabIndex={0}
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(valor * 100)}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onKeyDown={aoTeclar}
      >
        <span className={styles.marcador} style={{ transform: `rotate(${angulo}deg)` }} />
      </div>
      <span className={styles.rotuloBotao}>{rotulo}</span>
    </div>
  );
}

export default function RadioValvulas() {
  const t = useT();
  const { atual, tocando, progresso, duracao, volume, setVolume, buscar } = usePlayer();
  const ligado = Boolean(atual) && tocando;
  const fracao = duracao ? Math.min(1, progresso / duracao) : 0;

  return (
    <div className={`${styles.radio} ${ligado ? styles.ligado : ''}`}>
      <div className={styles.topo}>
        <span className={styles.marca}>Radiola</span>
        <span className={`${styles.olho} ${ligado ? styles.olhoAtivo : ''}`} aria-hidden="true" />
      </div>

      <div className={styles.visor}>
        <div className={styles.escala} aria-hidden="true">
          {ESCALA.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
        <div className={styles.tracos} aria-hidden="true" />
        <span className={styles.ponteiro} style={{ left: `${4 + fracao * 92}%` }} aria-hidden="true" />
        <div className={styles.estacao} aria-live="polite">
          {atual ? (
            <>
              <strong>{atual.titulo}</strong>
              <span>{atual.item.artista}</span>
            </>
          ) : (
            <span>{t('skins.foraDoAr')}</span>
          )}
        </div>
      </div>

      <div className={styles.alto} aria-hidden="true">
        <span className={styles.tecido} />
      </div>

      <div className={styles.paineis}>
        <BotaoGiratorio rotulo={t('skins.volume')} valor={volume} aoMudar={setVolume} />
        <div className={styles.valvulas} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <BotaoGiratorio rotulo={t('skins.sintonia')} valor={fracao} aoMudar={(v) => duracao && buscar(v * duracao)} passo={0.02} />
      </div>
    </div>
  );
}
