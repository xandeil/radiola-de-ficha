import { publicidadeService } from '@/services/publicidadeService';
import styles from './OndeComprar.module.css';

/*
 * Seção 8.3 – Links de afiliado (Mercado Livre, Amazon, Discogs).
 * TRANSPARÊNCIA: o aviso "a Radiola pode receber comissão" é obrigatório
 * (CDC e boas práticas de publicidade). rel="sponsored" avisa os buscadores.
 * Aparece para todos os planos: afiliado não é propaganda intrusiva, é um serviço.
 */
export default function OndeComprar({ titulo, artista, referencia }) {
  const links = publicidadeService.linksAfiliados(titulo, artista);
  return (
    <section className={styles.bloco}>
      <h2>Procurar outra cópia</h2>
      <p className={styles.texto}>Quer de presente, uma prensagem diferente ou trocar a sua riscada?</p>
      <div className={styles.links}>
        {links.map((l) => (
          <a
            key={l.parceiro}
            href={l.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className={`${styles.link} ${styles[l.parceiro]}`}
            onClick={() => publicidadeService.registrarCliqueAfiliado(l.parceiro, referencia)}
          >
            {l.nome}
          </a>
        ))}
      </div>
      <small className={styles.aviso}>Links patrocinados: a Radiola pode receber uma comissão, sem custo extra para você.</small>
    </section>
  );
}
