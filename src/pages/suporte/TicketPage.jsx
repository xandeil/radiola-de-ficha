import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useToast } from '@/contexts/ToastContext';
import { suporteService, STATUS_TICKET } from '@/services/suporteService';
import Conversa from '@/components/suporte/Conversa';
import Botao from '@/components/ui/Botao';
import Icone from '@/components/ui/Icone';
import { AreaTexto } from '@/components/ui/Campo';
import { Etiqueta } from '@/components/ui/Tabela';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { TOM_STATUS, rotuloCategoria } from './SuportePage';
import styles from './Suporte.module.css';

/** Conversa do ticket + responder + marcar resolvido + pesquisa CSAT (1 a 5). */
export default function TicketPage() {
  const { id } = useParams();
  const { mostrar } = useToast();
  const ticket = useCarregar(() => suporteService.ticket(id), [id]);
  const [resposta, setResposta] = useState('');
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (ticket.carregando && !ticket.dados) return <Carregando />;
  if (ticket.erro) return <EstadoErro erro={ticket.erro} />;
  const t = ticket.dados;

  const acao = async (fn, msg) => {
    setOcupado(true);
    try {
      await fn();
      if (msg) mostrar(msg);
      ticket.recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setOcupado(false);
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    if (!resposta.trim()) return;
    acao(async () => {
      await suporteService.responder(t.id, resposta);
      setResposta('');
    });
  };

  const fechado = ['resolvido', 'fechado'].includes(t.status);

  return (
    <div className={styles.ticket}>
      <Link to="/suporte" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} /> Suporte
      </Link>
      <header className={styles.cabecalhoTicket}>
        <div>
          <span className={styles.categoria}>#{t.id} · {rotuloCategoria(t.categoria)}</span>
          <h1>{t.assunto}</h1>
        </div>
        <Etiqueta tom={TOM_STATUS[t.status]}>{STATUS_TICKET[t.status]}</Etiqueta>
      </header>

      <Conversa mensagens={t.mensagens} ehMinha={(m) => m.autor === 'voce'} />

      {!fechado && (
        <form className={styles.responder} onSubmit={enviar}>
          <AreaTexto aria-label="Sua resposta" placeholder="Escreva sua resposta..." value={resposta} onChange={(e) => setResposta(e.target.value)} rows={3} maxLength={4000} />
          <div className={styles.acoes}>
            {t.mensagens.some((m) => m.autor === 'equipe') && (
              <Botao variante="fantasma" disabled={ocupado} onClick={() => acao(() => suporteService.marcarResolvido(t.id), 'Marcado como resolvido')}>
                Meu problema foi resolvido
              </Botao>
            )}
            <Botao type="submit" carregando={ocupado} disabled={!resposta.trim()}>Enviar</Botao>
          </div>
        </form>
      )}

      {t.status === 'resolvido' && !t.avaliacao && (
        <section className={styles.csat}>
          <h2>Como foi o atendimento?</h2>
          <div className={styles.estrelas} role="radiogroup" aria-label="Nota do atendimento">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} de 5`} className={n <= nota ? styles.cheia : ''} onClick={() => setNota(n)}>
                ★
              </button>
            ))}
          </div>
          <AreaTexto aria-label="Comentário (opcional)" placeholder="Quer comentar algo? (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} maxLength={500} />
          <Botao disabled={!nota} carregando={ocupado} onClick={() => acao(() => suporteService.avaliar(t.id, nota, comentario), 'Obrigado pela avaliação!')}>
            Enviar avaliação
          </Botao>
        </section>
      )}

      {t.avaliacao && <p className={styles.avaliado}>Você avaliou este atendimento com {t.avaliacao.nota} de 5. Obrigado!</p>}
    </div>
  );
}
