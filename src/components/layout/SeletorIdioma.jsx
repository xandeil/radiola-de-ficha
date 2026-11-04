import { useI18n } from '@/contexts/I18nContext';
import styles from './SeletorIdioma.module.css';

/*
 * Seletor compacto PT · EN · ES. Fica na tela de login (quem ainda não entrou
 * também precisa escolher) e no rodapé do menu lateral.
 * lang={codigo} em cada botão: o leitor de tela pronuncia "English" em inglês.
 */
export default function SeletorIdioma({ claro = false }) {
  const { idioma, setIdioma, idiomas, t } = useI18n();
  return (
    <div className={`${styles.seletor} ${claro ? styles.claro : ''}`} role="radiogroup" aria-label={t('comum.idioma')}>
      {idiomas.map((i) => (
        <button key={i.codigo} type="button" role="radio" aria-checked={idioma === i.codigo} lang={i.codigo} title={i.nome} aria-label={i.nome} onClick={() => setIdioma(i.codigo)}>
          {i.curto}
        </button>
      ))}
    </div>
  );
}
