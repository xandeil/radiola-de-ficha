import { useEffect, useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import styles from './Vitrola.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF027 / RF028 / RF031 – A vitrola clássica.
 *
 * Por que o giro é feito em JavaScript e não com animation do CSS?
 * Porque o CSS só sabe "girar" ou "parar" — não sabe acelerar aos poucos.
 * Com requestAnimationFrame calculamos a velocidade a cada quadro e ela
 * se aproxima suavemente do alvo: o disco "pega embalo" e "desliza" até parar,
 * como um prato de verdade.
 *
 * O braço (tonearm) é só CSS: parado fica no descanso; tocando, vai para a
 * borda do disco e avança para o centro conforme a música progride.
 */

const GRAUS_POR_SEGUNDO = { '33⅓': 200, 45: 270, 78: 468 };
const LIMIAR_GESTO = 60; // px arrastados para contar como "riscar" o disco

export default function Vitrola({ velocidade = '33⅓', tamanho = 'grande' }) {
  const t = useT();
  const { atual, tocando, progresso, duracao, alternar, proxima, anterior } = usePlayer();
  const discoRef = useRef(null);
  const animacao = useRef({ angulo: 0, velocidade: 0, ultimo: 0 });
  const gesto = useRef(null);

  const alvo = tocando ? GRAUS_POR_SEGUNDO[velocidade] || 200 : 0;

  useEffect(() => {
    let frame;
    const estado = animacao.current;

    const passo = (agora) => {
      const dt = estado.ultimo ? (agora - estado.ultimo) / 1000 : 0;
      estado.ultimo = agora;
      // Aproximação exponencial: ~70% do caminho por segundo ao acelerar, mais lento ao frear
      const fator = alvo > estado.velocidade ? 2.2 : 1.4;
      estado.velocidade += (alvo - estado.velocidade) * Math.min(1, fator * dt);
      if (alvo === 0 && estado.velocidade < 1) estado.velocidade = 0;
      estado.angulo = (estado.angulo + estado.velocidade * dt) % 360;
      if (discoRef.current) discoRef.current.style.transform = `rotate(${estado.angulo}deg)`;

      if (estado.velocidade > 0 || alvo > 0) frame = requestAnimationFrame(passo);
      else estado.ultimo = 0;
    };

    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [alvo]);

  // Braço: -8° (descanso) | 14° (borda) até 34° (centro), proporcional ao progresso
  const fracao = duracao ? Math.min(1, progresso / duracao) : 0;
  const anguloBraco = atual && tocando ? 14 + fracao * 20 : -8;

  // ---- gestos (RF031): toque pausa/toca, arrastar para os lados troca de faixa ----
  const aoPressionar = (e) => {
    gesto.current = { x: e.clientX };
  };
  const aoSoltar = (e) => {
    if (!gesto.current) return;
    const dx = e.clientX - gesto.current.x;
    gesto.current = null;
    if (dx > LIMIAR_GESTO) proxima();
    else if (dx < -LIMIAR_GESTO) anterior();
    else alternar();
  };

  const cor = atual?.item.cor_capa || 'var(--c-gold)';

  return (
    <div className={`${styles.vitrola} ${styles[tamanho]}`}>
      <div className={styles.base}>
        <div
          className={styles.prato}
          role="button"
          tabIndex={0}
          aria-label={tocando ? t('skins.vitrolaPausar') : t('skins.vitrolaTocar')}
          onPointerDown={aoPressionar}
          onPointerUp={aoSoltar}
          onPointerLeave={() => (gesto.current = null)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), alternar())}
        >
          <div ref={discoRef} className={`${styles.disco} ${!atual ? styles.vazio : ''}`}>
            <div className={styles.rotulo} style={{ '--cor-rotulo': cor }}>
              {atual && (
                <>
                  <span className={styles.rotuloTitulo}>{atual.item.titulo}</span>
                  <span className={styles.rotuloLado}>{atual.lado ? `Lado ${atual.lado}` : atual.item.tipo_midia}</span>
                </>
              )}
            </div>
            <span className={styles.brilho} aria-hidden="true" />
          </div>
        </div>

        <div className={styles.braco} style={{ transform: `rotate(${anguloBraco}deg)` }} aria-hidden="true">
          <span className={styles.pivo} />
          <span className={styles.haste} />
          <span className={styles.agulha} />
        </div>

        <span className={styles.rpm} aria-hidden="true">{velocidade} RPM</span>
        <span className={`${styles.luz} ${tocando ? styles.luzLigada : ''}`} aria-hidden="true" />
      </div>
    </div>
  );
}
