import { useId } from 'react';
import { Entrada } from '@/components/ui/Campo';
import styles from './Formulario.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * RF003 / RF006 / RF011 – Onde o item está fisicamente.
 * O <datalist> sugere locais já usados, para o usuário não escrever
 * "Sala" num disco e "sala de estar" no outro (o filtro agradece).
 */
export default function CamposLocalizacao({ valores = {}, locaisSugeridos = [], erros = {}, aoMudar }) {
  const t = useT();
  const idLista = useId();
  const mudar = (campo) => (e) => aoMudar({ ...valores, [campo]: e.target.value });

  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>{t('item.form.localizacao')}</h2>
      <p className={styles.secaoDescricao}>{t('item.form.localizacaoDesc')}</p>
      <div className={styles.grade}>
        <Entrada
          rotulo={t('campo.localPrincipal')}
          placeholder={t('campo.localPrincipalPh')}
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
        <Entrada rotulo={t('campo.movel')} placeholder={t('campo.movelPh')} value={valores.movel || ''} onChange={mudar('movel')} />
        <Entrada rotulo={t('campo.prateleira')} placeholder={t('campo.prateleiraPh')} value={valores.prateleira || ''} onChange={mudar('prateleira')} />
        <Entrada rotulo={t('campo.posicao')} placeholder={t('campo.posicaoPh')} value={valores.posicao || ''} onChange={mudar('posicao')} />
      </div>
    </section>
  );
}
