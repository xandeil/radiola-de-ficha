import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { adminService } from '@/services/adminService';
import { temPermissao } from '@/utils/permissoes';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Modal from '@/components/ui/Modal';
import { AreaTexto, Selecao } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { STATUS_TICKET } from '@/services/suporteService';
import { TOM_STATUS } from '@/pages/suporte/SuportePage';
import { formatarData, formatarMoeda, tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

/*
 * Perfil 360° (seção 9.2): coleção, social, assinatura, pagamentos e
 * tickets do cliente numa tela só. Quem atende não precisa abrir 5 abas.
 *
 * Suspender exige MOTIVO: fica no log de auditoria. Toda ação que afeta
 * um cliente precisa responder depois à pergunta "quem fez e por quê?".
 */
export default function AdminUsuarioPage() {
  const { id } = useParams();
  const { usuario: eu } = useAuth();
  const { mostrar } = useToast();
  const { dados: d, carregando, erro, recarregar } = useCarregar(() => adminService.usuario360(id), [id]);
  const [suspender, setSuspender] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (carregando && !d) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const u = d.usuario;
  const podeEditar = temPermissao(eu, 'usuarios.editar') && u.id !== eu.id;

  const executar = async (acao, sucesso) => {
    setSalvando(true);
    try {
      await acao();
      mostrar(sucesso);
      recarregar();
      return true;
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const confirmarSuspensao = async () => {
    if (await executar(() => adminService.alterarStatusUsuario(u.id, false, motivo.trim()), 'Conta suspensa')) {
      setSuspender(false);
      setMotivo('');
    }
  };

  return (
    <>
      <TituloPagina
        sobretitulo={<Link to="/admin/usuarios">← Usuários</Link>}
        titulo={u.nome}
        subtitulo={`${u.email} · @${u.apelido || '—'} · desde ${formatarData(u.data_cadastro)}`}
        acoes={
          podeEditar &&
          (u.ativo ? (
            <Botao variante="perigo" onClick={() => setSuspender(true)}>Suspender conta</Botao>
          ) : (
            <Botao carregando={salvando} onClick={() => executar(() => adminService.alterarStatusUsuario(u.id, true, 'Reativada pelo painel'), 'Conta reativada')}>
              Reativar conta
            </Botao>
          ))
        }
      />

      <div className={styles.blocos}>
        <div className={styles.bloco}><small>Situação</small><strong>{u.ativo ? 'Ativa' : 'Suspensa'}</strong><span>último acesso {u.ultimo_login ? tempoRelativo(u.ultimo_login) : '—'}</span></div>
        <div className={styles.bloco}><small>Plano</small><strong>{u.plano}</strong></div>
        <div className={styles.bloco}><small>Coleção</small><strong>{d.colecao.total}</strong><span>{Object.entries(d.colecao.porTipo).map(([t, n]) => `${n} ${t}`).join(' · ') || 'vazia'}</span></div>
        <div className={styles.bloco}><small>Social</small><strong>{d.social.amigos}</strong><span>amigos · {d.social.posts} posts</span></div>
      </div>

      <div className={styles.duasColunas}>
        <div>
          <section className={styles.cartao}>
            <h2>Pagamentos</h2>
            <Tabela
              legenda="Pagamentos"
              dados={d.transacoes}
              vazio="Nenhum pagamento."
              colunas={[
                { titulo: 'Data', render: (t) => formatarData(t.data_transacao) },
                { titulo: 'Descrição', campo: 'descricao' },
                { titulo: 'Método', campo: 'metodo_pagamento' },
                { titulo: 'Valor', render: (t) => formatarMoeda(t.valor), alinhar: 'direita' },
                { titulo: 'Status', render: (t) => <Etiqueta tom={t.status === 'aprovada' ? 'sucesso' : t.status === 'pendente' ? 'aviso' : 'erro'}>{t.status}</Etiqueta> },
              ]}
            />
          </section>
          <section className={styles.cartao}>
            <h2>Tickets</h2>
            <Tabela
              legenda="Tickets"
              dados={d.tickets}
              vazio="Nenhum ticket."
              colunas={[
                { titulo: 'Nº', render: (t) => <Link to={`/admin/tickets/${t.id}`}>#{t.id}</Link> },
                { titulo: 'Assunto', campo: 'assunto' },
                { titulo: 'Situação', render: (t) => <Etiqueta tom={TOM_STATUS[t.status]}>{STATUS_TICKET[t.status]}</Etiqueta> },
              ]}
            />
          </section>
        </div>

        <aside>
          <section className={styles.cartao}>
            <h2>Segmentos</h2>
            {d.segmentos.length ? (
              <div className={styles.acoes} style={{ marginTop: 0 }}>
                {d.segmentos.map((s) => <Etiqueta key={s.chave} tom="info">{s.nome}</Etiqueta>)}
              </div>
            ) : (
              <p className={styles.muted}>Não entra em nenhum segmento do CRM.</p>
            )}
          </section>
          <section className={styles.cartao}>
            <h2>Assinaturas</h2>
            <ul className={styles.lista}>
              {d.assinaturas.length === 0 && <li className={styles.muted}>Nunca assinou.</li>}
              {d.assinaturas.map((a) => (
                <li key={a.id}>
                  <span>#{a.id} · até {formatarData(a.data_expiracao || a.trial_ends)}</span>
                  <Etiqueta tom={a.status === 'ativa' ? 'sucesso' : a.status === 'trial' ? 'info' : 'neutro'}>{a.status}</Etiqueta>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.cartao}>
            <h2>Papel na equipe</h2>
            {podeEditar ? (
              <Selecao
                aria-label="Papel"
                vazio={null}
                opcoes={d.papeisDisponiveis.map((p) => ({ valor: p.nome, rotulo: p.rotulo, disabled: p.nivel >= d.meuNivel && d.meuNivel < 100 }))}
                value={d.papeis[0] || 'usuario'}
                onChange={(e) => executar(() => adminService.definirPapel(u.id, e.target.value), 'Papel atualizado')}
                disabled={salvando}
              />
            ) : (
              <p className={styles.muted}>{d.papeis.join(', ') || 'usuario'}</p>
            )}
            <p className={styles.muted}>Você só pode dar papéis abaixo do seu nível.</p>
          </section>
        </aside>
      </div>

      <Modal
        aberto={suspender}
        titulo={`Suspender ${u.nome}?`}
        aoFechar={() => setSuspender(false)}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setSuspender(false)}>Cancelar</Botao>
            <Botao variante="perigo" carregando={salvando} disabled={motivo.trim().length < 5} onClick={confirmarSuspensao}>Suspender</Botao>
          </>
        }
      >
        <p>A pessoa não consegue mais entrar até ser reativada. Os dados dela continuam guardados.</p>
        <AreaTexto rotulo="Motivo (vai para a auditoria)" obrigatorio value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
      </Modal>
    </>
  );
}
