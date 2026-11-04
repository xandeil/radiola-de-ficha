import { useCarregar } from '@/hooks/useCarregar';
import { conquistaService } from '@/services/conquistaService';
import TituloPagina from '@/components/ui/TituloPagina';
import NavSocial from '@/components/social/NavSocial';
import Selo from '@/components/social/Selo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { formatarData } from '@/utils/formatadores';
import styles from './ConquistasPage.module.css';
import { useT } from '@/contexts/I18nContext';
import { descricaoConquista, nomeConquista, nomeNivel } from '@/i18n/dominio';

/*
 * RF078–RF082 – Conquistas, selos e nível de colecionador.
 * Abrir esta página também VERIFICA as conquistas: se algo foi atingido
 * desde a última vez, já aparece desbloqueado.
 */

const CATEGORIAS = ['catalogo', 'diversidade', 'social'];

export default function ConquistasPage() {
  const t = useT();
  const { dados, carregando, erro, recarregar } = useCarregar(() => conquistaService.verificar(), []);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const { conquistas, pontos, nivel } = dados;
  const total = conquistas.filter((c) => c.desbloqueada).length;
  const faixaNivel = nivel.proximo ? nivel.proximo.pontos_minimos - nivel.pontos_minimos : 1;
  const andadoNivel = nivel.proximo ? pontos - nivel.pontos_minimos : 1;

  return (
    <>
      <TituloPagina titulo={t('social.conq.titulo')} subtitulo={t('social.conq.subtitulo', { n: total, total: conquistas.length })} />
      <NavSocial />

      <section className={styles.nivel}>
        <div className={styles.numeroNivel} aria-hidden="true">
          {nivel.nivel}
        </div>
        <div className={styles.infoNivel}>
          <span className={styles.rotulo}>{t('social.conq.nivelColecionador')}</span>
          <strong>{nomeNivel(nivel)}</strong>
          <div className={styles.barra} role="progressbar" aria-valuenow={pontos} aria-valuemin={nivel.pontos_minimos} aria-valuemax={nivel.proximo?.pontos_minimos || pontos} aria-label={t('social.conq.progressoNivel')}>
            <span style={{ width: `${Math.min(100, (andadoNivel / faixaNivel) * 100)}%` }} />
          </div>
          <span className={styles.detalhe}>
            {t('social.conq.pontos', { n: pontos })}
            {nivel.proximo && t('social.conq.faltam', { n: nivel.proximo.pontos_minimos - pontos, nivel: nomeNivel(nivel.proximo) })}
          </span>
        </div>
      </section>

      {CATEGORIAS.map((cat) => (
        <section key={cat} className={styles.categoria}>
          <h2>{t(`social.conq.cat.${cat}`)}</h2>
          <div className={styles.grade}>
            {conquistas
              .filter((c) => c.categoria === cat)
              .map((c) => (
                <article key={c.id} className={`${styles.conquista} ${c.desbloqueada ? styles.ganha : ''}`}>
                  <Selo nome={nomeConquista(c)} cor={c.cor} bloqueado={!c.desbloqueada} tamanho={64} />
                  <div className={styles.textoConquista}>
                    <strong>{nomeConquista(c)}</strong>
                    <span>{descricaoConquista(c)}</span>
                    {c.desbloqueada ? (
                      <small className={styles.data}>{t('social.conq.conquistadaEm', { data: formatarData(c.data_desbloqueio), pts: c.pontos })}</small>
                    ) : (
                      <>
                        <div className={styles.progresso} aria-label={t('social.conq.deMeta', { atual: c.atual, meta: c.meta })}>
                          <span style={{ width: `${(c.atual / c.meta) * 100}%` }} />
                        </div>
                        <small>
                          {c.atual} / {c.meta} · {c.pontos} pts
                        </small>
                      </>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
