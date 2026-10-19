import { useId } from 'react';
import { Entrada } from '@/components/ui/Campo';
import styles from './Formulario.module.css';

/*
 * RF003 / RF006 / RF011 – Onde o item está fisicamente.
 * O <datalist> sugere locais já usados, para o usuário não escrever
 * "Sala" num disco e "sala de estar" no outro (o filtro agradece).
 */
export default function CamposLocalizacao({ valores = {}, locaisSugeridos = [], erros = {}, aoMudar }) {
  const idLista = useId();
  const mudar = (campo) => (e) => aoMudar({ ...valores, [campo]: e.target.value });

  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>Localização física</h2>
      <p className={styles.secaoDescricao}>Para achar o disco na estante sem revirar tudo.</p>
      <div className={styles.grade}>
        <Entrada
          rotulo="Local principal"
          placeholder="Sala de Estar"
          list={idLista}
          obrigatorio
          erro={erros.local_principal}
          value={valores.local_principal || ''}
          onChange={mudar('local_principal')}
        />
        <datalist id={idLista}>
          {locaisSugeridos.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <Entrada rotulo="Móvel" placeholder="Estante Principal" value={valores.movel || ''} onChange={mudar('movel')} />
        <Entrada rotulo="Prateleira / divisória" placeholder="Prateleira 3" value={valores.prateleira || ''} onChange={mudar('prateleira')} />
        <Entrada rotulo="Posição" placeholder="Entre A e B" value={valores.posicao || ''} onChange={mudar('posicao')} />
      </div>
    </section>
  );
}
