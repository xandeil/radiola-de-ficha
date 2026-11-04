import { useEffect, useRef, useState } from 'react';
import { iniciarLeituraCamera, mensagemErroCamera } from '@/services/leitorCodigo';
import { analisarCodigo } from '@/utils/codigoBarras';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import styles from './LeitorCamera.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Câmera com mira (seção 6.2.1, passos 2 e 3).
 *
 * A câmera só liga quando o usuário aperta "Abrir câmera": pedir permissão
 * sem ele ter pedido nada assusta (e o navegador pode bloquear).
 *
 * O useEffect devolve a função de limpeza que DESLIGA a câmera. Ela roda
 * quando o componente sai da tela — por exemplo, ao trocar de aba ou
 * depois que o código foi lido.
 */
export default function LeitorCamera({ aoLer }) {
  const t = useT();
  const videoRef = useRef(null);
  const sessaoRef = useRef(null);
  const [ligada, setLigada] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [lanterna, setLanterna] = useState(false);
  const [temLanterna, setTemLanterna] = useState(false);
  const aoLerRef = useRef(aoLer);
  aoLerRef.current = aoLer;

  useEffect(() => {
    if (!ligada) return;
    let cancelado = false;

    iniciarLeituraCamera(videoRef.current, (texto) => {
      const analise = analisarCodigo(texto);
      if (!analise.valido) {
        setAviso(t('scanner.cam.incompleto', { texto }));
        return;
      }
      sessaoRef.current?.parar(); // achou: desliga já, para não ler de novo
      sessaoRef.current = null;
      aoLerRef.current(analise);
    })
      .then((sessao) => {
        if (cancelado) return sessao.parar();
        sessaoRef.current = sessao;
        setTemLanterna(sessao.temLanterna);
      })
      .catch((e) => {
        if (!cancelado) {
          setErro(mensagemErroCamera(e));
          setLigada(false);
        }
      });

    return () => {
      cancelado = true;
      sessaoRef.current?.parar();
      sessaoRef.current = null;
    };
  }, [ligada]);

  const alternarLanterna = () => {
    sessaoRef.current?.lanterna(!lanterna);
    setLanterna((l) => !l);
  };

  return (
    <div className={styles.leitor}>
      <div className={`${styles.visor} ${ligada ? styles.ligado : ''}`}>
        <video ref={videoRef} className={styles.video} muted playsInline aria-label={t('scanner.cam.imagem')} />
        {ligada ? (
          <>
            <span className={styles.mira} aria-hidden="true">
              <span className={styles.laser} />
            </span>
            <p className={styles.instrucao}>{aviso || t('scanner.cam.enquadre')}</p>
          </>
        ) : (
          <div className={styles.desligado}>
            <Icone nome="camera" tamanho={40} />
            <Botao onClick={() => { setErro(''); setAviso(''); setLigada(true); }}>{t('scanner.cam.abrir')}</Botao>
          </div>
        )}
      </div>

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      {ligada && (
        <div className={styles.acoes}>
          {temLanterna && (
            <Botao variante="secundario" tamanho="pequeno" onClick={alternarLanterna} aria-pressed={lanterna}>
              {lanterna ? t('scanner.cam.lanternaOff') : t('scanner.cam.lanterna')}
            </Botao>
          )}
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => setLigada(false)}>
            {t('scanner.cam.fechar')}
          </Botao>
        </div>
      )}
    </div>
  );
}
