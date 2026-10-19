import { useCarregar } from '@/hooks/useCarregar';
import { conquistaService } from '@/services/conquistaService';
import TituloPagina from '@/components/ui/TituloPagina';
import NavSocial from '@/components/social/NavSocial';
import Selo from '@/components/social/Selo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { formatarData } from '@/utils/formatadores';
import styles from './ConquistasPage.module.css';

/*
 * RF078–RF082 – Conquistas, selos e nível de colecionador.
 * Abrir esta página também VERIFICA as conquistas: se algo foi atingido
 * desde a última vez, já aparece desbloqueado.
 */

const CATEGORIAS = [
  { id: 'catalogo', titulo: 'Catalogação' },
  { id: 'diversidade', titulo: 'Diversidade' },
  { id: 'social', titulo: 'Social' },
];

export default function ConquistasPage() {
  const { dados, carregando, erro, recarregar } = useCarregar(() => conquistaService.verificar(), []);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const { conquistas, pontos, nivel } = dados;
  const total = conquistas.filter((c) => c.desbloqueada).length;
  const faixaNivel = nivel.proximo ? nivel.proximo.pontos_minimos - nivel.pontos_minimos : 1;
  const andadoNivel = nivel.proximo ? pontos - nivel.pontos_minimos : 1;

  return (
    <>
      <TituloPagina titulo="Conquistas" subtitulo={`${total} de ${conquistas.length} selos conquistados`} />
      <NavSocial />

      <section className={styles.nivel}>
        <div className={styles.numeroNivel} aria-hidden="true">
          {nivel.nivel}
        </div>
        <div className={styles.infoNivel}>
          <span className={styles.rotulo}>Nível de colecionador</span>
          <strong>{nivel.nome}</strong>
          <div className={styles.barra} role="progressbar" aria-valuenow={pontos} aria-valuemin={nivel.pontos_minimos} aria-valuemax={nivel.proximo?.pontos_minimos || pontos} aria-label="Progresso de nível">
            <span style={{ width: `${Math.min(100, (andadoNivel / faixaNivel) * 100)}%` }} />
          </div>
          <span className={styles.detalhe}>
            {pontos} pontos
            {nivel.proximo && ` · faltam ${nivel.proximo.pontos_minimos - pontos} para ${nivel.proximo.nome}`}
          </span>
        </div>
      </section>

      {CATEGORIAS.map((cat) => (
        <section key={cat.id} className={styles.categoria}>
          <h2>{cat.titulo}</h2>
          <div className={styles.grade}>
            {conquistas
              .filter((c) => c.categoria === cat.id)
              .map((c) => (
                <article key={c.id} className={`${styles.conquista} ${c.desbloqueada ? styles.ganha : ''}`}>
                  <Selo nome={c.nome} cor={c.cor} bloqueado={!c.desbloqueada} tamanho={64} />
                  <div className={styles.textoConquista}>
                    <strong>{c.nome}</strong>
                    <span>{c.descricao}</span>
                    {c.desbloqueada ? (
                      <small className={styles.data}>Conquistada em {formatarData(c.data_desbloqueio)} · +{c.pontos} pts</small>
                    ) : (
                      <>
                        <div className={styles.progresso} aria-label={`${c.atual} de ${c.meta}`}>
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
