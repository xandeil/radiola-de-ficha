import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { suporteService } from '@/services/suporteService';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import styles from './Suporte.module.css';

/** Artigo da base de conhecimento com "Isso ajudou?" (os números orientam quais artigos melhorar). */
export default function ArtigoPage() {
  const { slug } = useParams();
  const { dados: artigo, carregando, erro } = useCarregar(() => suporteService.artigo(slug), [slug]);
  const [votou, setVotou] = useState(null);

  if (carregando) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} />;

  const votar = async (util) => {
    await suporteService.votarArtigo(artigo.id, util);
    setVotou(util);
  };

  return (
    <article className={styles.leitura}>
      <Link to="/suporte" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} /> Ajuda
      </Link>
      <span className={styles.categoria}>{artigo.categoria}</span>
      <h1>{artigo.titulo}</h1>
      <p className={styles.corpo}>{artigo.conteudo}</p>

      <footer className={styles.voto}>
        {votou === null ? (
          <>
            <span>Isso ajudou?</span>
            <Botao variante="secundario" tamanho="pequeno" onClick={() => votar(true)}>Sim</Botao>
            <Botao variante="secundario" tamanho="pequeno" onClick={() => votar(false)}>Não</Botao>
          </>
        ) : votou ? (
          <span>Que bom! Obrigado pelo retorno.</span>
        ) : (
          <>
            <span>Poxa. Conta pra gente o que faltou:</span>
            <Botao tamanho="pequeno" para={`/suporte/novo?assunto=${encodeURIComponent(artigo.titulo)}`}>Abrir ticket</Botao>
          </>
        )}
      </footer>
    </article>
  );
}
