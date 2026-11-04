import { useEffect, useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import styles from './GravadorRolo.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF036 – Perfil "Gravador de Rolo": um tape deck com fita cassete.
 *
 * A física de verdade (e é por isso que fica bonito):
 *  - A fita passa pela cabeça com VELOCIDADE LINEAR CONSTANTE (4,76 cm/s num K7).
 *  - Conforme a música avança, a fita sai do carretel da esquerda e enrola
 *    no da direita: o raio da esquerda diminui, o da direita aumenta.
 *  - Velocidade angular = velocidade linear / raio. Então o carretel
 *    VAZIO gira RÁPIDO e o CHEIO gira devagar — exatamente como num deck real.
 *  - A área de fita é conservada: raio = √(raioDoEixo² + fração × (raioMáx² − raioDoEixo²)).
 *
 * Tudo isso roda a 60 quadros por segundo com requestAnimationFrame,
 * mexendo direto nos atributos do SVG por ref. Se usássemos setState a
 * cada quadro, o React re-renderizaria o componente 60x/s sem necessidade.
 */

const EIXO = 16; // raio do carretel vazio (unidades do SVG)
const CHEIO = 52; // raio com toda a fita enrolada
const VELOCIDADE = 140; // velocidade linear "visual" da fita (unidades/s)

const raioPara = (fracao) => Math.sqrt(EIXO ** 2 + fracao * (CHEIO ** 2 - EIXO ** 2));

function Carretel({ cx, cy, refFita, refEixo }) {
  return (
    <g>
      <circle ref={refFita} cx={cx} cy={cy} r={CHEIO / 2} className={styles.fitaEnrolada} />
      <g ref={refEixo} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r={EIXO} className={styles.eixo} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect key={a} x={cx - 2.5} y={cy - EIXO + 1} width={5} height={7} rx={1} className={styles.dente} transform={`rotate(${a} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={5} className={styles.centroEixo} />
      </g>
    </g>
  );
}

export default function GravadorRolo() {
  const t = useT();
  const { atual, tocando, progresso, duracao, alternar, proxima, anterior, buscar } = usePlayer();

  const refs = {
    fitaEsq: useRef(null),
    fitaDir: useRef(null),
    eixoEsq: useRef(null),
    eixoDir: useRef(null),
    contador: useRef(null),
    vuL: useRef(null),
    vuR: useRef(null),
  };

  // Valores que o loop de animação lê sem reiniciar o efeito
  const estado = useRef({ tocando, fracao: 0, anguloEsq: 0, anguloDir: 0, voltas: 0, ultimo: 0, tempo: 0 });
  estado.current.tocando = tocando;
  estado.current.fracao = duracao ? Math.min(1, progresso / duracao) : 0;

  // Faixa nova = contador zerado (como apertar o "reset" do deck)
  useEffect(() => {
    estado.current.voltas = 0;
  }, [atual?.chave]);

  useEffect(() => {
    let quadro;
    const passo = (agora) => {
      const e = estado.current;
      const dt = e.ultimo ? Math.min(0.1, (agora - e.ultimo) / 1000) : 0;
      e.ultimo = agora;
      e.tempo += dt;

      const raioEsq = raioPara(1 - e.fracao);
      const raioDir = raioPara(e.fracao);

      if (e.tocando) {
        // ω = v / r  (em graus por segundo)
        e.anguloEsq += ((VELOCIDADE / raioEsq) * 180) / Math.PI * dt;
        e.anguloDir += ((VELOCIDADE / raioDir) * 180) / Math.PI * dt;
        e.voltas += (VELOCIDADE / (2 * Math.PI * raioDir)) * dt; // 1 número por volta do carretel da direita
      }

      refs.fitaEsq.current?.setAttribute('r', raioEsq.toFixed(2));
      refs.fitaDir.current?.setAttribute('r', raioDir.toFixed(2));
      if (refs.eixoEsq.current) refs.eixoEsq.current.style.transform = `rotate(${e.anguloEsq}deg)`;
      if (refs.eixoDir.current) refs.eixoDir.current.style.transform = `rotate(${e.anguloDir}deg)`;
      if (refs.contador.current) refs.contador.current.textContent = String(Math.floor(e.voltas) % 1000).padStart(3, '0');

      // VU meters: sem áudio analisável, simulamos um sinal "musical" com senos de frequências diferentes
      const sinal = (fase) => (e.tocando ? 0.55 + 0.25 * Math.sin(e.tempo * 7.3 + fase) + 0.2 * Math.sin(e.tempo * 13.1 + fase * 2) : 0);
      if (refs.vuL.current) refs.vuL.current.style.transform = `rotate(${-50 + sinal(0) * 85}deg)`;
      if (refs.vuR.current) refs.vuR.current.style.transform = `rotate(${-50 + sinal(1.7) * 85}deg)`;

      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
    // refs são estáveis: o loop é criado uma única vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parar = () => {
    if (tocando) alternar();
    buscar(0);
  };

  const lado = atual?.lado || 'A';

  return (
    <div className={styles.deck}>
      <div className={styles.topo}>
        <span className={styles.marca}>RADIOLA · TAPE DECK</span>
        <div className={styles.contadorCaixa}>
          <span ref={refs.contador} className={styles.contador} aria-hidden="true">000</span>
          <span className={styles.rotuloPequeno}>CONTADOR</span>
        </div>
      </div>

      <svg viewBox="0 0 400 230" className={styles.cassete} role="img" aria-label={atual ? t('skins.fitaTocando', { titulo: atual.titulo, lado }) : t('skins.fitaParada')}>
        {/* corpo da fita */}
        <rect x="8" y="8" width="384" height="214" rx="14" className={styles.corpo} />
        {/* etiqueta */}
        <rect x="28" y="22" width="344" height="40" rx="4" className={styles.etiqueta} />
        <text x="40" y="40" className={styles.textoEtiqueta}>
          {(atual?.titulo || t('skins.semFita')).slice(0, 34)}
        </text>
        <text x="40" y="55" className={styles.textoEtiquetaMenor}>
          {(atual?.item.artista || t('skins.escolhaFita')).slice(0, 44)}
        </text>
        <rect x="336" y="28" width="28" height="28" rx="3" className={styles.lado} />
        <text x="350" y="48" textAnchor="middle" className={styles.textoLado}>
          {lado}
        </text>
        {/* janela */}
        <rect x="70" y="72" width="260" height="106" rx="10" className={styles.janela} />
        <Carretel cx={130} cy={125} refFita={refs.fitaEsq} refEixo={refs.eixoEsq} />
        <Carretel cx={270} cy={125} refFita={refs.fitaDir} refEixo={refs.eixoDir} />
        {/* caminho da fita até a cabeça de leitura */}
        <path d="M 96 190 L 130 214 L 270 214 L 304 190" className={styles.caminho} />
        <rect x="186" y="204" width="28" height="14" rx="2" className={styles.cabeca} />
        {/* parafusos */}
        {[[22, 22], [378, 22], [22, 208], [378, 208]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" className={styles.parafuso} />
        ))}
      </svg>

      <div className={styles.inferior}>
        <div className={styles.vus} aria-hidden="true">
          {[refs.vuL, refs.vuR].map((ref, i) => (
            <div key={i} className={styles.vu}>
              <span className={styles.escalaVu} />
              <span ref={ref} className={styles.agulha} />
              <span className={styles.canal}>{i ? 'R' : 'L'}</span>
            </div>
          ))}
        </div>

        <div className={styles.teclas} role="group" aria-label={t('skins.teclas')}>
          <button type="button" onClick={anterior} disabled={!atual} aria-label={t('skins.rebobinar')}>
            ◀◀<small>REW</small>
          </button>
          <button type="button" onClick={() => !tocando && alternar()} disabled={!atual} aria-pressed={tocando} className={tocando ? styles.apertada : ''} aria-label="Play">
            ▶<small>PLAY</small>
          </button>
          <button type="button" onClick={() => tocando && alternar()} disabled={!atual} aria-label={t('skins.pausa')}>
            ❚❚<small>PAUSE</small>
          </button>
          <button type="button" onClick={parar} disabled={!atual} aria-label={t('skins.parar')}>
            ■<small>STOP</small>
          </button>
          <button type="button" onClick={proxima} disabled={!atual} aria-label={t('skins.avancar')}>
            ▶▶<small>FF</small>
          </button>
        </div>
      </div>
    </div>
  );
}
