import { tempoRelativo } from '@/utils/formatadores';
import styles from './Conversa.module.css';

/*
 * Linha do tempo de um ticket, usada pelo usuário e pela equipe.
 * "lado" decide para qual lado vai o balão: 'eu' fica à direita.
 * Notas internas aparecem com fundo listrado (só a equipe as recebe).
 */
export default function Conversa({ mensagens, ehMinha }) {
  return (
    <ol className={styles.conversa}>
      {mensagens.map((m) => (
        <li key={m.id} className={`${styles.mensagem} ${ehMinha(m) ? styles.minha : ''} ${m.interna ? styles.interna : ''}`}>
          <div className={styles.balao}>
            <header>
              <strong>{m.nome}</strong>
              {m.interna && <span className={styles.nota}>nota interna</span>}
              <small>{tempoRelativo(m.data)}</small>
            </header>
            <p>{m.mensagem}</p>
            {m.anexos?.length > 0 && (
              <ul className={styles.anexos}>
                {m.anexos.map((a) => (
                  <li key={a.nome}>📎 {a.nome}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
