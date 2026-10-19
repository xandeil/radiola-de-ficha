import { Caixa, Entrada, Selecao } from '@/components/ui/Campo';
import { VELOCIDADES } from '@/utils/constantes';
import styles from './Formulario.module.css';

/*
 * Campos que mudam conforme o formato (RF001, RF004, RF007, RF009).
 *
 * Em vez de um if/else gigante no formulário, cada formato vira uma
 * função pequena e um "mapa" escolhe qual renderizar. Para adicionar
 * um formato novo (ex: Blu-ray), basta criar a função e colocar no mapa.
 * Isso é o princípio Aberto/Fechado (o "O" do SOLID) na prática.
 */

function CamposLP({ v, mudar }) {
  return (
    <>
      <Selecao rotulo="Velocidade (RPM)" opcoes={VELOCIDADES} value={v.velocidade || ''} onChange={mudar('velocidade')} />
      <Entrada rotulo="Cor do vinil" placeholder="Preto, splatter..." value={v.cor_vinil || ''} onChange={mudar('cor_vinil')} />
    </>
  );
}

function CamposCD({ v, mudar }) {
  return (
    <>
      <Entrada rotulo="Número de discos" type="number" min="1" value={v.numero_discos || ''} onChange={mudar('numero_discos')} />
      <Entrada rotulo="Páginas do encarte" type="number" min="0" value={v.paginas_encarte || ''} onChange={mudar('paginas_encarte')} dica="0 se não tiver livreto" />
      <Entrada rotulo="Matrix / SID Code" value={v.matrix_sid || ''} onChange={mudar('matrix_sid')} />
    </>
  );
}

function CamposDVD({ v, mudar }) {
  const ehFilme = v.subtipo === 'DVD de Filme';
  return (
    <>
      <Entrada rotulo="Região" placeholder="Ex: 4" value={v.regiao_dvd || ''} onChange={mudar('regiao_dvd')} />
      <Entrada rotulo="Formato de tela" placeholder="16:9, 4:3..." value={v.formato_tela || ''} onChange={mudar('formato_tela')} />
      {ehFilme && (
        <>
          <Entrada rotulo="Título original" value={v.titulo_original || ''} onChange={mudar('titulo_original')} />
          <Entrada rotulo="Diretor" value={v.diretor || ''} onChange={mudar('diretor')} />
          <Entrada rotulo="Duração (min)" type="number" min="1" value={v.duracao_min || ''} onChange={mudar('duracao_min')} />
          <Entrada rotulo="Classificação" placeholder="Livre, 12, 16..." value={v.classificacao || ''} onChange={mudar('classificacao')} />
          <Entrada className={styles.largo} rotulo="Elenco principal" placeholder="Separe por vírgula" value={v.elenco || ''} onChange={mudar('elenco')} />
        </>
      )}
    </>
  );
}

function CamposK7({ v, mudar, aoMudar }) {
  return (
    <>
      <Entrada rotulo="Ano de gravação" type="number" value={v.ano_gravacao || ''} onChange={mudar('ano_gravacao')} dica="Para mixtapes e gravações caseiras" />
      <Entrada rotulo="Duração total (min)" type="number" min="1" value={v.duracao_total_min || ''} onChange={mudar('duracao_total_min')} />
      <Entrada rotulo="Lado A (min)" type="number" min="0" value={v.lado_a_duracao_min || ''} onChange={mudar('lado_a_duracao_min')} />
      <Entrada rotulo="Lado B (min)" type="number" min="0" value={v.lado_b_duracao_min || ''} onChange={mudar('lado_b_duracao_min')} />
      <Entrada rotulo="Cor da fita" placeholder="Preta, transparente..." value={v.cor_fita || ''} onChange={mudar('cor_fita')} />
      <Caixa rotulo="Já foi digitalizada" checked={!!v.digitalizada} onChange={(e) => aoMudar('digitalizada', e.target.checked)} />
    </>
  );
}

const POR_TIPO = { LP: CamposLP, CD: CamposCD, DVD: CamposDVD, K7: CamposK7 };
const TITULOS = { LP: 'Detalhes do vinil', CD: 'Detalhes do CD', DVD: 'Detalhes do DVD', K7: 'Detalhes da fita' };

export default function CamposEspecificos({ valores, aoMudar }) {
  const Componente = POR_TIPO[valores.tipo_midia];
  if (!Componente) return null;

  const mudar = (campo) => (e) => aoMudar(campo, e.target.value);

  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>{TITULOS[valores.tipo_midia]}</h2>
      <p className={styles.secaoDescricao}>Campos específicos deste formato. Todos opcionais.</p>
      <div className={styles.grade}>
        <Componente v={valores} mudar={mudar} aoMudar={aoMudar} />
      </div>
    </section>
  );
}
