import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCarregar } from '@/hooks/useCarregar';
import { usePerfilLayout } from '@/hooks/usePerfilLayout';
import { catalogoService } from '@/services/catalogoService';
import Vitrola from '@/components/player/Vitrola';
import RadioValvulas from '@/components/player/RadioValvulas';
import Jukebox from '@/components/player/Jukebox';
import GravadorRolo from '@/components/player/GravadorRolo';
import { socialService } from '@/services/socialService';
import { useToast } from '@/contexts/ToastContext';
import Controles, { BarraProgresso, ControleVolume } from '@/components/player/Controles';
import ListaFila from '@/components/player/ListaFila';
import CapaMidia from '@/components/catalogo/CapaMidia';
import EncartePainel from '@/components/encarte/EncartePainel';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { PERFIS_LAYOUT } from '@/utils/constantes';
import { ModalUpsell } from '@/components/assinatura/RecursoPremium';
import styles from './PlayerPage.module.css';

/*
 * A Radiola (RF027–RF032, RF035–RF038).
 *  - Perfil visual escolhido pelo usuário: Vitrola Clássica ou Rádio de Válvulas
 *  - "Álbum do momento": escolher um disco da estante (RF030)
 *  - "Tocar algo": modo descobrimento (RF029)
 *  - Tela cheia imersiva (RF032)
 *  - Encarte digital ao lado, acompanhando a faixa que toca (RF038)
 *
 * Repare que Vitrola e RadioValvulas não recebem quase nada por props:
 * as duas leem o mesmo PlayerContext. Trocar o perfil é só trocar o
 * componente — o motor de som continua o mesmo, tocando sem interrupção.
 */

const COMPONENTES_PERFIL = { vitrola: Vitrola, radio: RadioValvulas, jukebox: Jukebox, gravador: GravadorRolo };
const RPM_VALIDOS = ['33⅓', '45', '78'];

const STATUS_MOTOR = {
  demo: 'Modo demonstração · sem arquivo de áudio',
  aguardando: 'Procurando no Spotify...',
  audio: 'Arquivo digitalizado',
  spotify: 'Tocando pelo Spotify',
};

export default function PlayerPage() {
  const { atual, tocarItem, motor, viaSpotify, linkSpotify, precisaPremium, aviso } = usePlayer();
  const { perfil, setPerfil, bloqueado } = usePerfilLayout();
  const [upsellPerfil, setUpsellPerfil] = useState(null);
  const { dados: itens } = useCarregar(() => catalogoService.listar(), []);
  const palco = useRef(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const { mostrar } = useToast();

  const tocaveis = (itens || []).filter((i) => i.faixas?.length);
  // O encarte precisa do item completo (com anotações), não só do resumo que vai na fila
  const itemAtual = atual?.item.id ? itens?.find((i) => i.id === atual.item.id) : null;

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

  // RF062 – "O que estou ouvindo" vai para o feed dos amigos (só metadados, nunca o áudio)
  const compartilhar = async () => {
    setCompartilhando(true);
    try {
      await socialService.publicar({
        tipo_post: 'ouvindo',
        id_item: atual.item.id,
        referencia: {
          titulo: atual.titulo,
          artista: atual.item.artista,
          formato: atual.fonte === 'spotify' ? 'Spotify' : atual.item.tipo_midia,
          cor_capa: atual.item.cor_capa,
          link: linkSpotify || undefined,
        },
        visibilidade: 'amigos',
      });
      mostrar('Publicado no feed dos seus amigos');
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setCompartilhando(false);
    }
  };

  const Perfil = COMPONENTES_PERFIL[perfil] || Vitrola;
  const rpm = RPM_VALIDOS.includes(atual?.item.velocidade) ? atual.item.velocidade : '33⅓';
  const status = motor === 'demo' && viaSpotify ? 'Spotify (demonstração) · sem som' : STATUS_MOTOR[motor];

  return (
    <div className={styles.pagina}>
      <section ref={palco} className={`${styles.palco} ${telaCheia ? styles.telaCheia : ''}`} aria-label="Player">
        <div className={styles.topoPalco}>
          <div className={styles.perfis} role="radiogroup" aria-label="Perfil do player">
            {PERFIS_LAYOUT.filter((p) => p.disponivel).map((p) => (
              <button
                key={p.valor}
                type="button"
                role="radio"
                aria-checked={perfil === p.valor}
                onClick={() => (bloqueado(p.valor) ? setUpsellPerfil(p) : setPerfil(p.valor))}
              >
                {p.rotulo}
                {bloqueado(p.valor) && <span aria-label=" (Premium)"> 🔒</span>}
              </button>
            ))}
          </div>
          <button type="button" className={styles.botaoTelaCheia} onClick={alternarTelaCheia} aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
            {telaCheia ? 'Sair' : 'Tela cheia'}
          </button>
        </div>

        <div className={styles.aparelho}>
          <Perfil velocidade={rpm} />
        </div>

        <div className={styles.agora}>
          {atual ? (
            <>
              <h1 className={styles.musica}>{atual.titulo}</h1>
              <p className={styles.disco}>
                {atual.item.id ? <Link to={`/catalogo/${atual.item.id}`}>{atual.item.titulo}</Link> : atual.item.titulo} ·{' '}
                {atual.item.artista}
              </p>
              <div className={styles.linhaStatus}>
                <span className={`${styles.status} ${viaSpotify ? styles.statusSpotify : ''}`}>{status}</span>
                <button type="button" className={styles.compartilhar} onClick={compartilhar} disabled={compartilhando}>
                  <Icone nome="compartilhar" tamanho={13} /> Compartilhar
                </button>
              </div>
              {aviso && <p className={styles.aviso}>{aviso}</p>}
              {precisaPremium && linkSpotify && (
                <p className={styles.aviso}>
                  Sua conta Spotify é Free: o navegador não pode tocar.{' '}
                  <a href={linkSpotify} target="_blank" rel="noreferrer">Abrir no Spotify</a>
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className={styles.musica}>
                {{ radio: 'O rádio está fora do ar', jukebox: 'A jukebox espera sua ficha', gravador: 'O deck está sem fita' }[perfil] || 'A vitrola está vazia'}
              </h1>
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

        {atual && (
          <EncartePainel
            key={atual.chave} // nova faixa = encarte zerado na primeira aba
            compacto
            item={itemAtual}
            artista={atual.item.artista}
            album={atual.item.titulo}
            faixa={atual.titulo}
            faixaId={atual.fonte === 'local' ? atual.id : null}
          />
        )}

        <section className={styles.bloco}>
          <h2>Álbum do momento</h2>
          <p className={styles.ajuda}>Toque numa capa para colocar o disco para tocar.</p>
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
      <ModalUpsell
        aberto={Boolean(upsellPerfil)}
        titulo={upsellPerfil ? `Perfil ${upsellPerfil.rotulo}` : ''}
        descricao="Rádio de Válvulas, Jukebox e Gravador de Rolo fazem parte da Radiola Completa. Experimente grátis por 7 dias."
        aoFechar={() => setUpsellPerfil(null)}
      />
    </div>
  );
}
