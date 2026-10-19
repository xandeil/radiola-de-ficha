import { Entrada, Selecao } from '@/components/ui/Campo';
import { ORDENACOES, TIPOS_MIDIA } from '@/utils/constantes';
import styles from './FiltrosCatalogo.module.css';

/*
 * Componente "controlado": não guarda estado próprio.
 * Recebe os filtros e devolve as mudanças pelo aoMudar.
 * Quem manda é a página — isso facilita salvar os filtros na URL.
 */
export default function FiltrosCatalogo({ filtros, locais = [], aoMudar }) {
  const mudar = (campo) => (e) => aoMudar({ ...filtros, [campo]: e.target.value });

  return (
    <div className={styles.filtros} role="search">
      <Entrada
        className={styles.busca}
        rotulo="Buscar"
        type="search"
        placeholder="Título, artista ou anotação..."
        value={filtros.busca}
        onChange={mudar('busca')}
      />
      <Selecao rotulo="Formato" opcoes={TIPOS_MIDIA} vazio="Todos" value={filtros.tipo} onChange={mudar('tipo')} />
      <Selecao rotulo="Local" opcoes={locais} vazio="Todos" value={filtros.local} onChange={mudar('local')} />
      <Selecao rotulo="Ordenar" opcoes={ORDENACOES} vazio={null} value={filtros.ordem} onChange={mudar('ordem')} />
    </div>
  );
}
