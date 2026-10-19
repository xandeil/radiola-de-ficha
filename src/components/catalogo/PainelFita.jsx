import { useState } from 'react';
import { catalogoService } from '@/services/catalogoService';
import { usePlayer } from '@/contexts/PlayerContext';
import { useToast } from '@/contexts/ToastContext';
import Botao from '@/components/ui/Botao';
import { formatarDuracao } from '@/utils/formatadores';
import styles from './PainelFita.module.css';

/*
 * Fase 3.5 – Acabamento do suporte a fita K7 (RF009–RF011).
 *
 * 1. Medidor por lado: soma das faixas x capacidade do lado (ex.: C60 = 30 min
 *    por lado). Mostra quanto sobra — ou avisa se as faixas cadastradas não
 *    cabem (erro comum ao catalogar mixtape de memória).
 * 2. Estado da digitalização, com atalho quando todas as faixas já têm áudio.
 */

function MedidorLado({ lado, capacidadeMin, faixas }) {
  const usado = faixas.reduce((s, f) => s + (f.duracao_segundos || 0), 0);
  const capacidade = (capacidadeMin || 0) * 60;
  const pct = capacidade ? Math.min(100, (usado / capacidade) * 100) : 0;
  const estourou = capacidade && usado > capacidade;

  return (
    <div className={styles.lado}>
      <div className={styles.cabecalhoLado}>
        <strong>Lado {lado}</strong>
        <span>
          {formatarDuracao(usado)} {capacidade ? `de ${capacidadeMin} min` : ''}
        </span>
      </div>
      <div className={styles.fita} role="meter" aria-valuemin={0} aria-valuemax={capacidade || 1} aria-valuenow={usado} aria-label={`Lado ${lado} usado`}>
        <span className={`${styles.usado} ${estourou ? styles.estourou : ''}`} style={{ width: `${capacidade ? pct : 0}%` }} />
      </div>
      <small className={estourou ? styles.alertaTexto : ''}>
        {!capacidade
          ? 'Informe a duração do lado na edição do item'
          : estourou
            ? `Passou ${formatarDuracao(usado - capacidade)} da capacidade — confira as durações`
            : `${faixas.length} ${faixas.length === 1 ? 'faixa' : 'faixas'} · sobra ${formatarDuracao(capacidade - usado)}`}
      </small>
    </div>
  );
}

export default function PainelFita({ item, aoAtualizar }) {
  const { arquivos } = usePlayer();
  const { mostrar } = useToast();
  const [salvando, setSalvando] = useState(false);
  const faixas = item.faixas || [];
  const todasComAudio = faixas.length > 0 && faixas.every((f) => arquivos[f.id] || f.arquivo_audio);

  const alternarDigitalizada = async () => {
    setSalvando(true);
    try {
      const atualizado = await catalogoService.marcarDigitalizada(item.id, !item.digitalizada);
      aoAtualizar(atualizado);
      mostrar(atualizado.digitalizada ? 'Fita marcada como digitalizada' : 'Marcação removida');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className={styles.painel}>
      <h2>Fita K7</h2>
      <div className={styles.lados}>
        <MedidorLado lado="A" capacidadeMin={item.lado_a_duracao_min} faixas={faixas.filter((f) => f.lado !== 'B')} />
        <MedidorLado lado="B" capacidadeMin={item.lado_b_duracao_min} faixas={faixas.filter((f) => f.lado === 'B')} />
      </div>

      <div className={styles.digitalizacao}>
        <span className={`${styles.etiqueta} ${item.digitalizada ? styles.sim : ''}`}>
          {item.digitalizada ? '✓ Digitalizada' : 'Ainda não digitalizada'}
        </span>
        {!item.digitalizada && todasComAudio && <span className={styles.dica}>Todas as faixas já têm áudio vinculado.</span>}
        <Botao tamanho="pequeno" variante={item.digitalizada ? 'fantasma' : 'secundario'} carregando={salvando} onClick={alternarDigitalizada}>
          {item.digitalizada ? 'Desmarcar' : 'Marcar como digitalizada'}
        </Botao>
      </div>
      {!item.digitalizada && (
        <p className={styles.nota}>
          Fita mofa e desmagnetiza com o tempo. Digitalizar com um tape deck + placa de captura salva a gravação para sempre.
        </p>
      )}
    </section>
  );
}
