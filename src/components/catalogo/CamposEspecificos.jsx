import { Caixa, Entrada, Selecao } from '@/components/ui/Campo';
import { VELOCIDADES } from '@/utils/constantes';
import styles from './Formulario.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Campos que mudam conforme o formato (RF001, RF004, RF007, RF009).
 *
 * Em vez de um if/else gigante no formulário, cada formato vira uma
 * função pequena e um "mapa" escolhe qual renderizar. Para adicionar
 * um formato novo (ex: Blu-ray), basta criar a função e colocar no mapa.
 * Isso é o princípio Aberto/Fechado (o "O" do SOLID) na prática.
 */

function CamposLP({ v, mudar }) {
  const t = useT();
  return (
    <>
      <Selecao rotulo={t('campo.velocidadeRpm')} opcoes={VELOCIDADES} value={v.velocidade || ''} onChange={mudar('velocidade')} />
      <Entrada rotulo={t('campo.corVinil')} placeholder={t('campo.corVinilPh')} value={v.cor_vinil || ''} onChange={mudar('cor_vinil')} />
    </>
  );
}

function CamposCD({ v, mudar }) {
  const t = useT();
  return (
    <>
      <Entrada rotulo={t('campo.numeroDiscos')} type="number" min="1" value={v.numero_discos || ''} onChange={mudar('numero_discos')} />
      <Entrada rotulo={t('campo.paginasEncarte')} type="number" min="0" value={v.paginas_encarte || ''} onChange={mudar('paginas_encarte')} dica={t('campo.paginasEncarteDica')} />
      <Entrada rotulo={t('campo.matrixCode')} value={v.matrix_sid || ''} onChange={mudar('matrix_sid')} />
    </>
  );
}

function CamposDVD({ v, mudar }) {
  const t = useT();
  const ehFilme = v.subtipo === 'DVD de Filme';
  return (
    <>
      <Entrada rotulo={t('campo.regiao')} placeholder={t('campo.regiaoPh')} value={v.regiao_dvd || ''} onChange={mudar('regiao_dvd')} />
      <Entrada rotulo={t('campo.formatoTela')} placeholder="16:9, 4:3..." value={v.formato_tela || ''} onChange={mudar('formato_tela')} />
      {ehFilme && (
        <>
          <Entrada rotulo={t('campo.tituloOriginal')} value={v.titulo_original || ''} onChange={mudar('titulo_original')} />
          <Entrada rotulo={t('campo.diretor')} value={v.diretor || ''} onChange={mudar('diretor')} />
          <Entrada rotulo={t('campo.duracaoMin')} type="number" min="1" value={v.duracao_min || ''} onChange={mudar('duracao_min')} />
          <Entrada rotulo={t('campo.classificacao')} placeholder={t('campo.classificacaoPh')} value={v.classificacao || ''} onChange={mudar('classificacao')} />
          <Entrada className={styles.largo} rotulo={t('campo.elencoPrincipal')} placeholder={t('campo.separeVirgula')} value={v.elenco || ''} onChange={mudar('elenco')} />
        </>
      )}
    </>
  );
}

function CamposK7({ v, mudar, aoMudar }) {
  const t = useT();
  return (
    <>
      <Entrada rotulo={t('campo.anoGravacao')} type="number" value={v.ano_gravacao || ''} onChange={mudar('ano_gravacao')} dica={t('campo.anoGravacaoDica')} />
      <Entrada rotulo={t('campo.duracaoTotal')} type="number" min="1" value={v.duracao_total_min || ''} onChange={mudar('duracao_total_min')} />
      <Entrada rotulo={t('campo.ladoAMin')} type="number" min="0" value={v.lado_a_duracao_min || ''} onChange={mudar('lado_a_duracao_min')} />
      <Entrada rotulo={t('campo.ladoBMin')} type="number" min="0" value={v.lado_b_duracao_min || ''} onChange={mudar('lado_b_duracao_min')} />
      <Entrada rotulo={t('campo.corFita')} placeholder={t('campo.corFitaPh')} value={v.cor_fita || ''} onChange={mudar('cor_fita')} />
      <Caixa rotulo={t('campo.jaDigitalizada')} checked={!!v.digitalizada} onChange={(e) => aoMudar('digitalizada', e.target.checked)} />
    </>
  );
}

const POR_TIPO = { LP: CamposLP, CD: CamposCD, DVD: CamposDVD, K7: CamposK7 };

export default function CamposEspecificos({ valores, aoMudar }) {
  const t = useT();
  const Componente = POR_TIPO[valores.tipo_midia];
  if (!Componente) return null;

  const mudar = (campo) => (e) => aoMudar(campo, e.target.value);

  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>{t(`item.form.titulos.${valores.tipo_midia}`)}</h2>
      <p className={styles.secaoDescricao}>{t('item.form.especificosDesc')}</p>
      <div className={styles.grade}>
        <Componente v={valores} mudar={mudar} aoMudar={aoMudar} />
      </div>
    </section>
  );
}
