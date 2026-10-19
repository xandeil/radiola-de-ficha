import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCarregar } from '@/hooks/useCarregar';
import { catalogoService } from '@/services/catalogoService';
import Vitrola from '@/components/player/Vitrola';
import Controles, { BarraProgresso, ControleVolume } from '@/components/player/Controles';
import ListaFila from '@/components/player/ListaFila';
import CapaMidia from '@/components/catalogo/CapaMidia';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import styles from './PlayerPage.module.css';

/*
 * A Radiola — perfil "Vitrola Clássica" (RF027–RF032).
 *  - Vitrola animada no centro
 *  - "Álbum do momento": escolher um disco da estante para tocar (RF030)
 *  - "Tocar algo": modo descobrimento, sorteia um disco (RF029)
 *  - Tela cheia imersiva (RF032)
 */
export default function PlayerPage() {
  const { atual, tocarItem, temAudioReal } = usePlayer();
  const { dados: itens } = useCarregar(() => catalogoService.listar(), []);
  const palco = useRef(null);
  const [telaCheia, setTelaCheia] = useState(false);

  const tocaveis = (itens || []).filter((i) => i.faixas?.length);
  const itemAtual = itens?.find((i) => i.id === atual?.item.id);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else palco.current?.requestFullscreen?.();
  };

  const tocarAlgo = () => {
    if (tocaveis.length) tocarItem(tocaveis[Math.floor(Math.random() * tocaveis.length)]);
  };

  return (
    <div className={styles.pagina}>
      <section ref={palco} className={`${styles.palco} ${telaCheia ? styles.telaCheia : ''}`} aria-label="Vitrola">
        <div className={styles.topoPalco}>
          <span className={styles.perfil}>Vitrola Clássica</span>
          <button type="button" className={styles.botaoTelaCheia} onClick={alternarTelaCheia} aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
            {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
          </button>
        </div>

        <Vitrola velocidade={itemAtual?.velocidade && itemAtual.velocidade !== 'N/A' ? itemAtual.velocidade : '33⅓'} />

        <div className={styles.agora}>
          {atual ? (
            <>
              <h1 className={styles.musica}>{atual.titulo}</h1>
              <p className={styles.disco}>
                <Link to={`/catalogo/${atual.item.id}`}>{atual.item.titulo}</Link> · {atual.item.artista}
              </p>
              {!temAudioReal && <span className={styles.demo}>Modo demonstração · sem arquivo de áudio</span>}
            </>
          ) : (
            <>
              <h1 className={styles.musica}>A vitrola está vazia</h1>
              <p className={styles.disco}>Escolha um disco abaixo ou deixe a radiola escolher.</p>
              <Botao className={styles.tocarAlgo} icone={<Icone nome="play" />} onClick={tocarAlgo} disabled={!tocaveis.length}>
                Tocar algo
              </Botao>
            </>
          )}
        </div>

        <div className={styles.painel}>
          <BarraProgresso />
          <div className={styles.linhaControles}>
            <span />
            <Controles />
            <ControleVolume />
          </div>
        </div>
      </section>

      <div className={styles.lateral}>
        <section className={styles.bloco}>
          <h2>Fila</h2>
          <ListaFila />
        </section>

        <section className={styles.bloco}>
          <h2>Álbum do momento</h2>
          <p className={styles.ajuda}>Toque numa capa para colocar o disco no prato.</p>
          {tocaveis.length === 0 ? (
            <p className={styles.ajuda}>
              Nenhum item com faixas ainda. <Link to="/catalogo/novo">Cadastre um</Link>.
            </p>
          ) : (
            <div className={styles.estante}>
              {tocaveis.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.capaBotao} ${atual?.item.id === item.id ? styles.capaAtual : ''}`}
                  onClick={() => tocarItem(item)}
                  aria-label={`Tocar ${item.titulo}`}
                >
                  <CapaMidia item={item} tamanho="miniatura" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
