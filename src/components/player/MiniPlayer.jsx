import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import CapaMidia from '@/components/catalogo/CapaMidia';
import Controles, { BarraProgresso, ControleVolume } from './Controles';
import { useT } from '@/contexts/I18nContext';
import styles from './MiniPlayer.module.css';

/*
 * Player fixo no rodapé: a música continua enquanto você navega no catálogo.
 * Só aparece quando há algo na fila.
 */
export default function MiniPlayer() {
  const { atual } = usePlayer();
  const t = useT();
  const { pathname } = useLocation();
  // Na própria página da vitrola os controles já estão na tela
  if (!atual || pathname === '/player') return null;

  return (
    <div className={styles.mini} role="region" aria-label={t('player.reproducaoAtual')}>
      <div className={styles.barra}>
        <BarraProgresso compacta />
      </div>
      <Link to="/player" className={styles.faixa}>
        <CapaMidia item={atual.item} tamanho="pequeno" />
        <span className={styles.texto}>
          <strong>{atual.titulo}</strong>
          <small>{atual.item.artista}</small>
        </span>
      </Link>
      <Controles compacto />
      <div className={styles.volume}>
        <ControleVolume />
      </div>
    </div>
  );
}
