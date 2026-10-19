import { Entrada, Selecao } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { LADOS } from '@/utils/constantes';
import { formatarDuracao, lerDuracao } from '@/utils/formatadores';
import styles from './Formulario.module.css';

/*
 * RF002 / RF005 / RF010 – Lista editável de faixas.
 *
 * Cada faixa tem uma "chave" local estável (chaveLocal). Nunca use o
 * índice do array como key no React quando a lista pode ser reordenada
 * ou ter itens removidos: o React confunde os inputs e você vê o texto
 * "pular" de uma linha para outra.
 */

// crypto.randomUUID() só existe em HTTPS/localhost; isto funciona em qualquer lugar
export const gerarChave = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const novaFaixa = (numero, lado = 'A') => ({
  chaveLocal: gerarChave(),
  numero,
  lado,
  titulo: '',
  duracao_texto: '',
  compositores: '',
});

export default function EditorFaixas({ faixas, temLado, erros = {}, aoMudar }) {
  const atualizar = (indice, campo, valor) =>
    aoMudar(faixas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));

  const adicionar = () => {
    const ultima = faixas.at(-1);
    aoMudar([...faixas, novaFaixa(faixas.length + 1, ultima?.lado || 'A')]);
  };

  const remover = (indice) =>
    aoMudar(faixas.filter((_, i) => i !== indice).map((f, i) => ({ ...f, numero: i + 1 })));

  const mover = (indice, direcao) => {
    const destino = indice + direcao;
    if (destino < 0 || destino >= faixas.length) return;
    const copia = [...faixas];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    aoMudar(copia.map((f, i) => ({ ...f, numero: i + 1 })));
  };

  const totalSegundos = faixas.reduce((soma, f) => soma + (lerDuracao(f.duracao_texto) || 0), 0);
  const classeLinha = temLado ? styles.faixa : `${styles.faixa} ${styles.faixaSemLado}`;

  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>Faixas</h2>
      <p className={styles.secaoDescricao}>Duração no formato mm:ss. As faixas são o que a vitrola vai tocar.</p>

      {faixas.length > 0 && (
        <div className={styles.faixas}>
          <div className={`${classeLinha} ${styles.cabecalhoFaixas}`} aria-hidden="true">
            {temLado && <span>Lado</span>}
            <span>Nº</span>
            <span>Título</span>
            <span>Duração</span>
            <span>Compositores</span>
            <span />
          </div>

          {faixas.map((faixa, i) => (
            <div key={faixa.chaveLocal} className={classeLinha}>
              {temLado && (
                <Selecao aria-label={`Lado da faixa ${i + 1}`} opcoes={LADOS} vazio={null} value={faixa.lado || 'A'} onChange={(e) => atualizar(i, 'lado', e.target.value)} />
              )}
              <Entrada aria-label={`Número da faixa ${i + 1}`} type="number" min="1" value={faixa.numero} onChange={(e) => atualizar(i, 'numero', Number(e.target.value))} />
              <Entrada
                aria-label={`Título da faixa ${i + 1}`}
                placeholder="Título da música"
                value={faixa.titulo}
                erro={erros[`faixa_${i}_titulo`]}
                onChange={(e) => atualizar(i, 'titulo', e.target.value)}
              />
              <Entrada
                aria-label={`Duração da faixa ${i + 1}`}
                placeholder="3:45"
                inputMode="numeric"
                value={faixa.duracao_texto}
                erro={erros[`faixa_${i}_duracao`]}
                onChange={(e) => atualizar(i, 'duracao_texto', e.target.value)}
              />
              <Entrada aria-label={`Compositores da faixa ${i + 1}`} placeholder="Opcional" value={faixa.compositores || ''} onChange={(e) => atualizar(i, 'compositores', e.target.value)} />
              <div className={styles.acoesFaixa}>
                <button type="button" className={styles.iconeBotao} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para cima">
                  <Icone nome="cima" />
                </button>
                <button type="button" className={styles.iconeBotao} onClick={() => mover(i, 1)} disabled={i === faixas.length - 1} aria-label="Mover para baixo">
                  <Icone nome="baixo" />
                </button>
                <button type="button" className={styles.iconeBotao} onClick={() => remover(i)} aria-label={`Remover faixa ${i + 1}`}>
                  <Icone nome="lixo" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.rodapeFaixas}>
        <Botao variante="secundario" tamanho="pequeno" icone={<Icone nome="mais" tamanho={14} />} onClick={adicionar}>
          Adicionar faixa
        </Botao>
        {faixas.length > 0 && (
          <span>
            {faixas.length} {faixas.length === 1 ? 'faixa' : 'faixas'} · {formatarDuracao(totalSegundos)}
          </span>
        )}
      </div>
    </section>
  );
}
