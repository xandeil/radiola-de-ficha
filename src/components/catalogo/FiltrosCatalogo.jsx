import { Entrada, Selecao } from '@/components/ui/Campo';
import { opcoesOrdenacao, opcoesTiposMidia } from '@/i18n/dominio';
import styles from './FiltrosCatalogo.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Componente "controlado": não guarda estado próprio.
 * Recebe os filtros e devolve as mudanças pelo aoMudar.
 * Quem manda é a página — isso facilita salvar os filtros na URL.
 */
export default function FiltrosCatalogo({ filtros, locais = [], aoMudar }) {
  const t = useT();
  const mudar = (campo) => (e) => aoMudar({ ...filtros, [campo]: e.target.value });

  return (
    <div className={styles.filtros} role="search">
      <Entrada
        className={styles.busca}
        rotulo={t('catalogo.filtro.buscar')}
        type="search"
        placeholder={t('catalogo.filtro.buscarPlaceholder')}
        value={filtros.busca}
        onChange={mudar('busca')}
      />
      <Selecao rotulo={t('catalogo.filtro.formato')} opcoes={opcoesTiposMidia()} vazio={t('catalogo.filtro.todos')} value={filtros.tipo} onChange={mudar('tipo')} />
      <Selecao rotulo={t('catalogo.filtro.local')} opcoes={locais} vazio={t('catalogo.filtro.todos')} value={filtros.local} onChange={mudar('local')} />
      {filtros.tipo === 'K7' && (
        <Selecao
          rotulo={t('catalogo.filtro.digitalizacao')}
          vazio={t('catalogo.filtro.todas')}
          opcoes={[{ valor: 'sim', rotulo: t('catalogo.filtro.digitalizadas') }, { valor: 'nao', rotulo: t('catalogo.filtro.naoDigitalizadas') }]}
          value={filtros.digitalizada}
          onChange={mudar('digitalizada')}
        />
      )}
      <Selecao rotulo={t('catalogo.filtro.ordenar')} opcoes={opcoesOrdenacao()} vazio={null} value={filtros.ordem} onChange={mudar('ordem')} />
    </div>
  );
}
