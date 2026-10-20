import { useCarregar } from '@/hooks/useCarregar';
import { usePlano } from '@/contexts/PlanoContext';
import { assinaturaService, valorDoPlano } from '@/services/assinaturaService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import { AcoesUpsell } from '@/components/assinatura/RecursoPremium';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { formatarMoeda } from '@/utils/formatadores';
import styles from './Planos.module.css';
import { useI18n, useT } from '@/contexts/I18nContext';

/*
 * RF046–RF050 – Vitrine de planos + tabela comparativa.
 * A tabela é gerada a partir de uma lista de linhas [rótulo, função],
 * então adicionar um recurso novo à comparação é uma linha só.
 */

const comparacao = (t) => [
  [t('assinatura.planos.cmp.itens'), (p) => (p.limite_itens ? t('assinatura.planos.cmp.ate', { n: p.limite_itens }) : t('assinatura.planos.cmp.ilimitado'))],
  [t('assinatura.planos.cmp.perfis'), (p) => (p.recursos.perfis > 1 ? t('assinatura.planos.cmp.todos4') : t('assinatura.planos.cmp.vitrola'))],
  [t('assinatura.planos.cmp.scanner'), (p) => p.recursos.scanner],
  [t('assinatura.planos.cmp.encarte'), (p) => (p.recursos.encarte === 'completo' ? t('assinatura.planos.cmp.completo') : t('assinatura.planos.cmp.basico'))],
  [t('assinatura.planos.cmp.propagandas'), (p) => (p.propagandas ? t('assinatura.planos.cmp.discretas') : t('assinatura.planos.cmp.nenhuma'))],
  [t('assinatura.planos.cmp.backup'), (p) => (p.backup_dias ? t('assinatura.planos.cmp.dias', { n: p.backup_dias }) : false)],
  [t('assinatura.planos.cmp.pessoas'), (p) => p.max_membros || 1],
  [t('assinatura.planos.cmp.selo'), (p) => Boolean(p.recursos.selo_anual)],
];

const celula = (valor) => (valor === true ? '✓' : valor === false ? '—' : valor);

export default function PlanosPage() {
  const { plano: atual, assinatura, trialDisponivel, emTrial } = usePlano();
  const t = useT();
  const { idioma } = useI18n();
  // idioma nas dependências: trocar o idioma busca os planos de novo, já traduzidos pelo servidor
  const { dados: planos, carregando, erro } = useCarregar(() => assinaturaService.planos(), [idioma]);

  if (carregando && !planos) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} />;

  const mensal = planos.find((p) => p.codigo === 'premium_mensal');
  const economiaAnual = valorDoPlano(mensal) * 12 - planos.find((p) => p.codigo === 'premium_anual').preco_anual;

  const acaoDoPlano = (p) => {
    if (p.id === atual.id && !emTrial) return <Botao variante="secundario" disabled>{t('assinatura.planos.atual')}</Botao>;
    if (p.id === 1) return assinatura ? <Botao variante="fantasma" para="/assinatura">{t('assinatura.planos.gerenciar')}</Botao> : null;
    return (
      <Botao variante={p.codigo === 'premium_anual' ? 'primario' : 'secundario'} para={`/assinatura/checkout/${p.codigo}`}>
        {atual.id === 1 || emTrial ? t('assinatura.planos.assinar') : t('assinatura.planos.mudar')}
      </Botao>
    );
  };

  return (
    <>
      <TituloPagina titulo={t('assinatura.planos.titulo')} subtitulo={t('assinatura.planos.subtitulo')} />

      {trialDisponivel && (
        <section className={styles.trial}>
          <div>
            <strong>{t('assinatura.planos.trialTitulo')}</strong>
            <span>{t('assinatura.planos.trialTexto')}</span>
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
              {p.codigo === 'premium_anual' && <span className={styles.fita}>{t('assinatura.planos.maisVantajoso')}</span>}
              <h2>{p.nome}</h2>
              <p className={styles.descricao}>{p.descricao}</p>
              <div className={styles.preco}>
                {valor === 0 ? (
                  <strong>{t('assinatura.planos.gratis')}</strong>
                ) : (
                  <>
                    <strong>{formatarMoeda(valor)}</strong>
                    <span>{anual ? t('assinatura.planos.porAno') : t('assinatura.planos.porMes')}</span>
                  </>
                )}
              </div>
              <small className={styles.equivalente}>
                {anual && t('assinatura.planos.equivale', { valor: formatarMoeda(valor / 12) })}
                {p.codigo === 'premium_anual' && t('assinatura.planos.economize', { valor: formatarMoeda(economiaAnual) })}
                {p.codigo === 'familia' && t('assinatura.planos.porPessoa', { valor: formatarMoeda(valor / 12 / p.max_membros) })}
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
        <h2>{t('assinatura.planos.comparacao')}</h2>
        <div className={styles.tabelaContainer}>
          <table>
            <thead>
              <tr>
                <th scope="col">{t('assinatura.planos.recurso')}</th>
                {planos.map((p) => (
                  <th key={p.id} scope="col">{p.nome.replace('Radiola ', '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparacao(t).map(([rotulo, valorDe]) => (
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
        <h2>{t('assinatura.planos.faq')}</h2>
        {[1, 2, 3, 4].map((n) => (
          <details key={n}>
            <summary>{t(`assinatura.planos.faq${n}p`)}</summary>
            <p>{t(`assinatura.planos.faq${n}r`)}</p>
          </details>
        ))}
      </section>
    </>
  );
}
