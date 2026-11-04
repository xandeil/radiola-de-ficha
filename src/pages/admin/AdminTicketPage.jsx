import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { adminService } from '@/services/adminService';
import { STATUS_TICKET } from '@/services/suporteService';
import { TOM_STATUS, rotuloCategoria } from '@/pages/suporte/SuportePage';
import Conversa from '@/components/suporte/Conversa';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import { AreaTexto, Caixa, Selecao } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { Etiqueta } from '@/components/ui/Tabela';
import { PRIORIDADES } from './AdminTicketsPage';
import { formatarData } from '@/utils/formatadores';
import styles from './Admin.module.css';

/*
 * Ticket visto pela equipe. Diferenças para a tela do cliente:
 * - "Nota interna": conversa entre agentes que o cliente NUNCA recebe
 *   (o serviço do cliente filtra; não basta esconder no CSS!).
 * - Respostas prontas para as dúvidas mais comuns (agilidade + padrão).
 * - Ao responder, o agente escolhe o status seguinte.
 */

const RESPOSTAS_PRONTAS = [
  { rotulo: 'Saudação', texto: 'Olá! Obrigado por falar com a Radiola. ' },
  { rotulo: 'Pedir print', texto: 'Pode nos mandar um print da tela onde o problema aparece? Assim conseguimos reproduzir aqui.' },
  { rotulo: 'Cobrança', texto: 'Verificamos aqui: a segunda cobrança é uma pré-autorização do cartão e some da fatura em até 7 dias úteis.' },
  { rotulo: 'Encerramento', texto: 'Qualquer coisa é só responder por aqui. Boa música! 🎶' },
];

export default function AdminTicketPage() {
  const { id } = useParams();
  const { usuario: eu } = useAuth();
  const { mostrar } = useToast();
  const { dados: t, carregando, erro, recarregar } = useCarregar(() => adminService.ticket(id), [id]);
  const [mensagem, setMensagem] = useState('');
  const [interna, setInterna] = useState(false);
  const [proximoStatus, setProximoStatus] = useState('respondido');
  const [ocupado, setOcupado] = useState(false);

  if (carregando && !t) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const acao = async (fn, msg) => {
    setOcupado(true);
    try {
      await fn();
      mostrar(msg);
      recarregar();
      return true;
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (!mensagem.trim()) return;
    const ok = await acao(
      () => adminService.responderTicket(t.id, { mensagem, interna, novoStatus: interna ? undefined : proximoStatus }),
      interna ? 'Nota interna salva' : 'Resposta enviada ao cliente',
    );
    if (ok) setMensagem('');
  };

  return (
    <>
      <TituloPagina
        sobretitulo={<Link to="/admin/tickets">← Fila de tickets</Link>}
        titulo={t.assunto}
        subtitulo={`#${t.id} · ${rotuloCategoria(t.categoria)} · aberto em ${formatarData(t.data_abertura)}`}
        acoes={<Etiqueta tom={TOM_STATUS[t.status]}>{STATUS_TICKET[t.status]}</Etiqueta>}
      />

      <div className={styles.duasColunas}>
        <div>
          <Conversa mensagens={t.mensagens} ehMinha={(m) => m.equipe} />

          <form className={styles.cartao} onSubmit={enviar} style={{ marginTop: 16 }}>
            <div className={styles.acoes} style={{ marginTop: 0, marginBottom: 10 }}>
              {RESPOSTAS_PRONTAS.map((r) => (
                <Botao key={r.rotulo} variante="fantasma" tamanho="pequeno" onClick={() => setMensagem((m) => m + r.texto)}>
                  + {r.rotulo}
                </Botao>
              ))}
            </div>
            <AreaTexto aria-label="Mensagem" placeholder={interna ? 'Nota visível só para a equipe...' : 'Resposta para o cliente...'} value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} />
            <div className={styles.acoes}>
              <Caixa rotulo="Nota interna (o cliente não vê)" checked={interna} onChange={(e) => setInterna(e.target.checked)} />
              {!interna && (
                <Selecao
                  aria-label="Status depois de responder"
                  vazio={null}
                  opcoes={[
                    { valor: 'respondido', rotulo: 'Respondido' },
                    { valor: 'aguardando_usuario', rotulo: 'Aguardando cliente' },
                    { valor: 'resolvido', rotulo: 'Resolvido' },
                  ]}
                  value={proximoStatus}
                  onChange={(e) => setProximoStatus(e.target.value)}
                />
              )}
              <Botao type="submit" variante={interna ? 'secundario' : 'primario'} carregando={ocupado} disabled={!mensagem.trim()}>
                {interna ? 'Salvar nota' : 'Enviar resposta'}
              </Botao>
            </div>
          </form>
        </div>

        <aside>
          <section className={styles.cartao}>
            <h2>Cliente</h2>
            <p>
              <Link to={`/admin/usuarios/${t.usuario.id}`}>{t.usuario.nome}</Link>
              <br />
              <span className={styles.muted}>{t.usuario.email} · plano {t.usuario.plano || 'gratuito'}</span>
            </p>
          </section>
          <section className={styles.cartao}>
            <h2>Atendimento</h2>
            <div className={styles.formulario}>
              <Selecao rotulo="Prioridade" vazio={null} opcoes={PRIORIDADES} value={t.prioridade} disabled={ocupado} onChange={(e) => acao(() => adminService.atualizarTicket(t.id, { prioridade: e.target.value }), 'Prioridade alterada')} />
              <p className={styles.muted} style={{ margin: 0 }}>
                Responsável: <strong>{t.agente?.nome || 'ninguém'}</strong>
              </p>
              {t.agente?.id !== eu.id && (
                <Botao variante="secundario" carregando={ocupado} onClick={() => acao(() => adminService.atualizarTicket(t.id, { assumir: true }), 'Ticket é seu agora')}>
                  Assumir ticket
                </Botao>
              )}
              {t.status !== 'fechado' && (
                <Botao variante="fantasma" disabled={ocupado} onClick={() => acao(() => adminService.atualizarTicket(t.id, { status: 'fechado' }), 'Ticket fechado')}>
                  Fechar sem resposta
                </Botao>
              )}
            </div>
          </section>
          {t.avaliacao && (
            <section className={styles.cartao}>
              <h2>Avaliação</h2>
              <p>
                {'★'.repeat(t.avaliacao.nota)}
                {'☆'.repeat(5 - t.avaliacao.nota)} ({t.avaliacao.nota}/5)
              </p>
              {t.avaliacao.comentario && <p className={styles.muted}>“{t.avaliacao.comentario}”</p>}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
