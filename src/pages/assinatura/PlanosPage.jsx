import { useCarregar } from '@/hooks/useCarregar';
import { usePlano } from '@/contexts/PlanoContext';
import { assinaturaService, valorDoPlano } from '@/services/assinaturaService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import { AcoesUpsell } from '@/components/assinatura/RecursoPremium';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { formatarMoeda } from '@/utils/formatadores';
import styles from './Planos.module.css';

/*
 * RF046–RF050 – Vitrine de planos + tabela comparativa.
 * A tabela é gerada a partir de uma lista de linhas [rótulo, função],
 * então adicionar um recurso novo à comparação é uma linha só.
 */

const COMPARACAO = [
  ['Itens no catálogo', (p) => (p.limite_itens ? `até ${p.limite_itens}` : 'ilimitado')],
  ['Perfis do player', (p) => (p.recursos.perfis > 1 ? 'todos os 4' : 'Vitrola Clássica')],
  ['Scanner de código de barras', (p) => p.recursos.scanner],
  ['Encarte digital', (p) => (p.recursos.encarte === 'completo' ? 'completo' : 'básico')],
  ['Propagandas', (p) => (p.propagandas ? 'discretas' : 'nenhuma')],
  ['Backup automático', (p) => (p.backup_dias ? `${p.backup_dias} dias` : false)],
  ['Pessoas', (p) => p.max_membros || 1],
  ['Selo no perfil', (p) => Boolean(p.recursos.selo_anual)],
];

const celula = (valor) => (valor === true ? '✓' : valor === false ? '—' : valor);

export default function PlanosPage() {
  const { plano: atual, assinatura, trialDisponivel, emTrial } = usePlano();
  const { dados: planos, carregando, erro } = useCarregar(() => assinaturaService.planos(), []);

  if (carregando) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} />;

  const mensal = planos.find((p) => p.codigo === 'premium_mensal');
  const economiaAnual = valorDoPlano(mensal) * 12 - planos.find((p) => p.codigo === 'premium_anual').preco_anual;

  const acaoDoPlano = (p) => {
    if (p.id === atual.id && !emTrial) return <Botao variante="secundario" disabled>Seu plano atual</Botao>;
    if (p.id === 1) return assinatura ? <Botao variante="fantasma" para="/assinatura">Gerenciar assinatura</Botao> : null;
    return (
      <Botao variante={p.codigo === 'premium_anual' ? 'primario' : 'secundario'} para={`/assinatura/checkout/${p.codigo}`}>
        {atual.id === 1 || emTrial ? 'Assinar' : 'Mudar para este'}
      </Botao>
    );
  };

  return (
    <>
      <TituloPagina titulo="Planos da Radiola" subtitulo="Escolha como quer ouvir e organizar sua coleção. Cancele quando quiser." />

      {trialDisponivel && (
        <section className={styles.trial}>
          <div>
            <strong>Experimente o Premium por 7 dias</strong>
            <span>Sem cartão. Volta sozinho para o gratuito se você não assinar.</span>
          </div>
          <AcoesUpsell />
        </section>
      )}

      <div className={styles.grade}>
        {planos.map((p) => {
          const valor = valorDoPlano(p);
          const anual = Boolean(p.preco_anual);
          return (
            <article key={p.id} className={`${styles.plano} ${p.codigo === 'premium_anual' ? styles.destaque : ''} ${p.id === atual.id ? styles.atual : ''}`}>
              {p.codigo === 'premium_anual' && <span className={styles.fita}>Mais vantajoso</span>}
              <h2>{p.nome}</h2>
              <p className={styles.descricao}>{p.descricao}</p>
              <div className={styles.preco}>
                {valor === 0 ? (
                  <strong>Grátis</strong>
                ) : (
                  <>
                    <strong>{formatarMoeda(valor)}</strong>
                    <span>/{anual ? 'ano' : 'mês'}</span>
                  </>
                )}
              </div>
              <small className={styles.equivalente}>
                {anual && `equivale a ${formatarMoeda(valor / 12)}/mês`}
                {p.codigo === 'premium_anual' && ` · economize ${formatarMoeda(economiaAnual)}`}
                {p.codigo === 'familia' && ` · ${formatarMoeda(valor / 12 / p.max_membros)} por pessoa`}
              </small>
              <ul className={styles.destaques}>
                {p.destaques.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <div className={styles.acao}>{acaoDoPlano(p)}</div>
            </article>
          );
        })}
      </div>

      <section className={styles.comparacao}>
        <h2>Comparação completa</h2>
        <div className={styles.tabelaContainer}>
          <table>
            <thead>
              <tr>
                <th scope="col">Recurso</th>
                {planos.map((p) => (
                  <th key={p.id} scope="col">{p.nome.replace('Radiola ', '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARACAO.map(([rotulo, valorDe]) => (
                <tr key={rotulo}>
                  <th scope="row">{rotulo}</th>
                  {planos.map((p) => (
                    <td key={p.id}>{celula(valorDe(p))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.faq}>
        <h2>Perguntas frequentes</h2>
        <details>
          <summary>Posso cancelar quando quiser?</summary>
          <p>Sim. Você continua com o Premium até o fim do período já pago, e seus dados ficam guardados por mais 30 dias.</p>
        </details>
        <details>
          <summary>E se eu mudar de plano no meio do mês?</summary>
          <p>No upgrade, os dias que sobraram do plano atual viram crédito no novo. No downgrade, a troca acontece no fim do período, sem cobrança agora.</p>
        </details>
        <details>
          <summary>Quais formas de pagamento?</summary>
          <p>Cartão de crédito, Pix e boleto, processados pelo Mercado Pago. A Radiola nunca vê nem guarda o número do seu cartão.</p>
        </details>
        <details>
          <summary>Como funciona o plano Universitário?</summary>
          <p>Envie um comprovante de matrícula (renovado todo ano). O desconto vale por até 48 meses.</p>
        </details>
      </section>
    </>
  );
}
