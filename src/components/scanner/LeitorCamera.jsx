import { useEffect, useRef, useState } from 'react';
import { iniciarLeituraCamera, mensagemErroCamera } from '@/services/leitorCodigo';
import { analisarCodigo } from '@/utils/codigoBarras';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import styles from './LeitorCamera.module.css';

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
        setAviso(`Li "${texto}", mas parece incompleto. Segure firme...`);
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
        <video ref={videoRef} className={styles.video} muted playsInline aria-label="Imagem da câmera" />
        {ligada ? (
          <>
            <span className={styles.mira} aria-hidden="true">
              <span className={styles.laser} />
            </span>
            <p className={styles.instrucao}>{aviso || 'Enquadre o código de barras dentro do retângulo'}</p>
          </>
        ) : (
          <div className={styles.desligado}>
            <Icone nome="camera" tamanho={40} />
            <Botao onClick={() => { setErro(''); setAviso(''); setLigada(true); }}>Abrir câmera</Botao>
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
              {lanterna ? 'Desligar lanterna' : 'Lanterna'}
            </Botao>
          )}
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => setLigada(false)}>
            Fechar câmera
          </Botao>
        </div>
      )}
    </div>
  );
}
