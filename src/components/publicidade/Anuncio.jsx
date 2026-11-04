import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlano } from '@/contexts/PlanoContext';
import { publicidadeService } from '@/services/publicidadeService';
import styles from './Anuncio.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Peças publicitárias do plano gratuito (seção 8.1).
 *
 * Regras que TODAS seguem (e que a lei e o bom senso pedem):
 *  - identificadas como "Publicidade" (o usuário precisa saber que é anúncio);
 *  - link com rel="sponsored" (avisa os buscadores que é link pago);
 *  - atalho "Remover anúncios" levando aos planos;
 *  - nunca aparecem para assinantes (o hook já devolve null).
 */

/**
 * Escolhe a campanha UMA vez por montagem e registra a impressão.
 * O useRef evita contar duas impressões no StrictMode (que roda efeitos 2x em dev).
 */
export function usePropaganda(formato, contexto = {}, pagina = '') {
  const { comPropaganda } = usePlano();
  const [campanha, setCampanha] = useState(null);
  const [idImpressao, setIdImpressao] = useState(null);
  const jaEscolheu = useRef(false);

  useEffect(() => {
    if (!comPropaganda || jaEscolheu.current) return;
    jaEscolheu.current = true;
    const escolhida = publicidadeService.escolher(formato, contexto);
    if (!escolhida) return;
    setCampanha(escolhida);
    setIdImpressao(publicidadeService.registrarImpressao(escolhida, formato, pagina));
    // contexto é lido só na primeira vez de propósito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comPropaganda, formato, pagina]);

  if (!comPropaganda) return { campanha: null };
  return { campanha, aoClicar: () => publicidadeService.registrarClique(idImpressao) };
}

function Rotulo() {
  const t = useT();
  return (
    <span className={styles.rotulo}>
      {t('anuncio.publicidade')} · <Link to="/planos">{t('anuncio.remover')}</Link>
    </span>
  );
}

/** Banner horizontal (728×90 no desktop, adapta no celular). */
export function BannerTopo({ pagina }) {
  const t = useT();
  const { campanha, aoClicar } = usePropaganda('banner', {}, pagina);
  if (!campanha) return null;
  const c = campanha.conteudo_json;
  return (
    <aside className={styles.banner} style={{ '--cor-ad': c.cor }} aria-label={t('anuncio.publicidade')}>
      <a href={campanha.url_destino} target="_blank" rel="sponsored noopener noreferrer" onClick={aoClicar} className={styles.bannerLink}>
        <strong>{c.titulo}</strong>
        <span>{c.texto}</span>
        <em>{c.cta} →</em>
      </a>
      <Rotulo />
    </aside>
  );
}

/** Card patrocinado no formato de uma "ficha" do catálogo. */
export function CardPatrocinado({ contexto, pagina }) {
  const t = useT();
  const { campanha, aoClicar } = usePropaganda('card', contexto, pagina);
  if (!campanha) return null;
  const c = campanha.conteudo_json;
  return (
    <aside className={styles.card} aria-label={t('anuncio.publicidade')}>
      <a href={campanha.url_destino} target="_blank" rel="sponsored noopener noreferrer" onClick={aoClicar} className={styles.cardLink}>
        <span className={styles.cardCapa} style={{ '--cor-ad': c.cor }}>
          <span>{c.titulo}</span>
        </span>
        <span className={styles.cardTexto}>{c.texto}</span>
        <em>{c.cta} →</em>
      </a>
      <Rotulo />
    </aside>
  );
}

/** Post nativo no feed, identificado como "Patrocinado". */
export function PostPatrocinado({ pagina }) {
  const t = useT();
  const { campanha, aoClicar } = usePropaganda('post_nativo', {}, pagina);
  if (!campanha) return null;
  const c = campanha.conteudo_json;
  return (
    <aside className={styles.post} aria-label={t('anuncio.publicidade')}>
      <div className={styles.postCabecalho}>
        <span className={styles.postAvatar} style={{ background: c.cor }} aria-hidden="true">
          {campanha.nome[0]}
        </span>
        <div>
          <strong>{campanha.nome}</strong>
          <small>{t('anuncio.patrocinado')}</small>
        </div>
      </div>
      <p className={styles.postTitulo}>{c.titulo}</p>
      <p className={styles.postTexto}>{c.texto}</p>
      <a href={campanha.url_destino} target="_blank" rel="sponsored noopener noreferrer" onClick={aoClicar} className={styles.postCta}>
        {c.cta}
      </a>
      <Rotulo />
    </aside>
  );
}
