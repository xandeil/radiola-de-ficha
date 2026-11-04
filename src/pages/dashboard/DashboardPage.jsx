import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useCarregar } from '@/hooks/useCarregar';
import { catalogoService } from '@/services/catalogoService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import FichaItem from '@/components/catalogo/FichaItem';
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Estados';
import { LIMITE_PLANO_GRATUITO, TIPOS_MIDIA } from '@/utils/constantes';
import { formatarMoeda } from '@/utils/formatadores';
import styles from './DashboardPage.module.css';
import { useT } from '@/contexts/I18nContext';
import { rotuloDominio } from '@/i18n/dominio';

/*
 * Painel inicial: números da coleção, limite do plano e últimos cadastros.
 * As estatísticas são DERIVADAS dos itens com useMemo — não guardamos em
 * useState, porque seria uma segunda cópia da mesma informação que pode
 * ficar desatualizada (regra: estado mínimo, o resto se calcula).
 */
export default function DashboardPage() {
  const t = useT();
  const { usuario } = useAuth();
  const { tocarItem } = usePlayer();
  const navegar = useNavigate();
  const { dados: itens, carregando, erro, recarregar } = useCarregar(() => catalogoService.listar(), []);

  const estatisticas = useMemo(() => {
    if (!itens) return null;
    const porTipo = Object.fromEntries(TIPOS_MIDIA.map((t) => [t.valor, 0]));
    let valor = 0;
    let faixas = 0;
    for (const item of itens) {
      porTipo[item.tipo_midia] = (porTipo[item.tipo_midia] || 0) + 1;
      valor += Number(item.valor_estimado) || 0;
      faixas += item.faixas?.length || 0;
    }
    return { total: itens.length, porTipo, valor, faixas };
  }, [itens]);

  // RF029 – Modo "Descobrimento": sorteia um disco com faixas e põe para tocar
  const tocarAlgo = () => {
    const tocaveis = itens.filter((i) => i.faixas?.length);
    if (!tocaveis.length) return;
    tocarItem(tocaveis[Math.floor(Math.random() * tocaveis.length)]);
    navegar('/player');
  };

  if (carregando) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const primeiroNome = usuario?.nome?.split(' ')[0];
  const gratuito = usuario?.plano === 'gratuito';
  const usoPlano = Math.min(100, (estatisticas.total / LIMITE_PLANO_GRATUITO) * 100);

  return (
    <>
      <TituloPagina
        sobretitulo={t('dashboard.sobretitulo')}
        titulo={t('dashboard.ola', { nome: primeiroNome })}
        subtitulo={t('dashboard.subtitulo')}
        acoes={
          <>
            <Botao variante="secundario" icone={<Icone nome="vitrola" />} onClick={tocarAlgo} disabled={!estatisticas.faixas}>
              {t('dashboard.tocarAlgo')}
            </Botao>
            <Botao variante="secundario" para="/scanner" icone={<Icone nome="codigo" />}>
              {t('dashboard.escanear')}
            </Botao>
            <Botao para="/catalogo/novo" icone={<Icone nome="mais" />}>
              {t('dashboard.adicionarItem')}
            </Botao>
          </>
        }
      />

      <section className={styles.numeros} aria-label={t('dashboard.numeros')}>
        <div className={`${styles.cartao} ${styles.destaque}`}>
          <span className={styles.rotulo}>{t('dashboard.itensColecao')}</span>
          <strong className={styles.valor}>{estatisticas.total}</strong>
          <span className={styles.detalhe}>{t('dashboard.faixasCatalogadas', { count: estatisticas.faixas })}</span>
        </div>
        {TIPOS_MIDIA.map((tipo) => (
          <div key={tipo.valor} className={styles.cartao}>
            <span className={styles.rotulo}>{rotuloDominio('tipo', tipo.valor)}</span>
            <strong className={styles.valor}>{estatisticas.porTipo[tipo.valor]}</strong>
          </div>
        ))}
        <div className={styles.cartao}>
          <span className={styles.rotulo}>{t('dashboard.valorEstimado')}</span>
          <strong className={styles.valorMenor}>{formatarMoeda(estatisticas.valor)}</strong>
        </div>
      </section>

      {gratuito && (
        <section className={styles.plano}>
          <div className={styles.planoTexto}>
            <strong>{t('dashboard.planoBasico')}</strong>
            <span>{t('dashboard.usoPlano', { usados: estatisticas.total, limite: LIMITE_PLANO_GRATUITO })}</span>
          </div>
          <Botao variante="fantasma" tamanho="pequeno" para="/planos">{t('dashboard.verPlanos')}</Botao>
          <div className={styles.planoBarra} role="progressbar" aria-valuenow={estatisticas.total} aria-valuemin={0} aria-valuemax={LIMITE_PLANO_GRATUITO} aria-label={t('dashboard.usoPlanoRotulo')}>
            <span style={{ width: `${usoPlano}%` }} className={usoPlano >= 80 ? styles.quaseCheio : ''} />
          </div>
        </section>
      )}

      <section>
        <div className={styles.cabecalhoSecao}>
          <h2>{t('dashboard.recentes')}</h2>
          {itens.length > 0 && <Botao variante="fantasma" tamanho="pequeno" para="/catalogo">{t('dashboard.verTudo')}</Botao>}
        </div>
        {itens.length === 0 ? (
          <EstadoVazio
            titulo={t('dashboard.vazioTitulo')}
            mensagem={t('dashboard.vazioTexto')}
            acao={<Botao para="/catalogo/novo">{t('dashboard.vazioAcao')}</Botao>}
          />
        ) : (
          <div className={styles.recentes}>
            {itens.slice(0, 5).map((item) => (
              <FichaItem key={item.id} item={item} aoTocar={(i) => tocarItem(i)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
