import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlano } from '@/contexts/PlanoContext';
import { useToast } from '@/contexts/ToastContext';
import { assinaturaService, planoPorCodigo } from '@/services/assinaturaService';
import { planosMock } from '@/mocks/assinatura';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Modal from '@/components/ui/Modal';
import Alerta from '@/components/ui/Alerta';
import { AreaTexto, Entrada, Selecao } from '@/components/ui/Campo';
import { AcoesUpsell } from '@/components/assinatura/RecursoPremium';
import { Carregando } from '@/components/ui/Estados';
import { formatarData, formatarMoeda } from '@/utils/formatadores';
import * as validar from '@/utils/validadores';
import styles from './MinhaAssinatura.module.css';

/*
 * RF051–RF053 – Painel da assinatura: plano, renovação, histórico,
 * mudança de plano, cancelamento (com oferta de retenção, seção 9.4)
 * e membros do plano Família (RF049).
 */

const MOTIVOS = [
  { valor: 'preco', rotulo: 'Está caro para mim' },
  { valor: 'falta_uso', rotulo: 'Quase não uso' },
  { valor: 'dificuldade', rotulo: 'Achei difícil de usar' },
  { valor: 'problemas_tecnicos', rotulo: 'Tive problemas técnicos' },
  { valor: 'mudou_streaming', rotulo: 'Vou usar outro serviço' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

const STATUS_ASSINATURA = { ativa: 'Ativa', trial: 'Teste grátis', cancelada: 'Cancelada (vale até o fim do período)' };
const STATUS_TRANSACAO = { aprovada: 'Aprovado', pendente: 'Pendente', recusada: 'Recusado', estornada: 'Estornado', reembolsada: 'Reembolsado' };
const METODO = { cartao: 'Cartão', pix: 'Pix', boleto: 'Boleto' };

const dataIso = (iso) => (iso ? formatarData(`${iso.slice(0, 10)}T12:00:00`) : '—');

/** Cancelamento em 3 passos: motivo -> oferta de retenção -> confirmação. */
function FluxoCancelamento({ aberto, emTrial, aoFechar, aoConcluir }) {
  const [passo, setPasso] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (aceitouOferta) => {
    setEnviando(true);
    try {
      await assinaturaService.cancelar({ motivo, detalhe, aceitouOferta });
      aoConcluir(aceitouOferta);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const ofertaFazSentido = !emTrial && ['preco', 'falta_uso'].includes(motivo);

  return (
    <Modal aberto={aberto} titulo={passo === 2 ? 'Antes de você ir...' : 'Cancelar assinatura'} aoFechar={aoFechar}>
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {passo === 1 && (
        <div className={styles.passo}>
          <p>Que pena! Conta pra gente o motivo — isso ajuda a melhorar a Radiola.</p>
          <Selecao rotulo="Motivo principal" opcoes={MOTIVOS} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <AreaTexto rotulo="Quer contar mais? (opcional)" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={500} />
          <div className={styles.acoesModal}>
            <Botao variante="secundario" onClick={aoFechar}>Voltar</Botao>
            <Botao variante="perigo" disabled={!motivo} onClick={() => (ofertaFazSentido ? setPasso(2) : setPasso(3))}>
              Continuar
            </Botao>
          </div>
        </div>
      )}
      {passo === 2 && (
        <div className={styles.passo}>
          <div className={styles.oferta}>
            <strong>50% de desconto no próximo ciclo</strong>
            <span>Fique com a Radiola Completa pela metade do preço na próxima cobrança.</span>
          </div>
          <div className={styles.acoesModal}>
            <Botao variante="fantasma" onClick={() => setPasso(3)}>Não, quero cancelar</Botao>
            <Botao carregando={enviando} onClick={() => enviar(true)}>Aceitar oferta</Botao>
          </div>
        </div>
      )}
      {passo === 3 && (
        <div className={styles.passo}>
          <p>
            {emTrial
              ? 'O teste grátis termina agora e sua conta volta para o plano gratuito.'
              : 'Você continua com o Premium até o fim do período já pago. Depois disso, a conta volta para o gratuito e seus dados ficam guardados por 30 dias.'}
          </p>
          <div className={styles.acoesModal}>
            <Botao variante="secundario" onClick={aoFechar}>Manter assinatura</Botao>
            <Botao variante="perigo" carregando={enviando} onClick={() => enviar(false)}>Confirmar cancelamento</Botao>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Familia({ membros, aoMudar }) {
  const { mostrar } = useToast();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');

  const adicionar = async (e) => {
    e.preventDefault();
    const msg = validar.email(email);
    if (msg) return setErro(msg);
    try {
      await assinaturaService.adicionarMembroFamilia(email);
      setEmail('');
      setErro('');
      mostrar(`Convite enviado para ${email}`);
      aoMudar();
    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <section className={styles.cartao}>
      <h2>Família ({membros.length + 1} de 5)</h2>
      <p className={styles.muted}>Você é o titular. Cada pessoa tem o próprio catálogo e login.</p>
      <ul className={styles.membros}>
        <li><strong>Você</strong> <span>titular</span></li>
        {membros.map((m) => (
          <li key={m.id}>
            <span>{m.email}</span>
            <span>{m.status === 'convidado' ? 'convite enviado' : 'ativo'}</span>
            <button type="button" onClick={() => assinaturaService.removerMembroFamilia(m.id).then(aoMudar)} aria-label={`Remover ${m.email}`}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      {membros.length < 4 && (
        <form className={styles.convite} onSubmit={adicionar} noValidate>
          <Entrada type="email" aria-label="E-mail do novo membro" placeholder="email@familia.com" value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
          <Botao type="submit" variante="secundario">Convidar</Botao>
        </form>
      )}
    </section>
  );
}

export default function MinhaAssinaturaPage() {
  const { carregado, plano, assinatura, premium, emTrial, transacoes, membrosFamilia, recarregar } = usePlano();
  const { mostrar } = useToast();
  const [cancelando, setCancelando] = useState(false);

  if (!carregado) return <Carregando />;

  const mudanca = assinatura?.mudanca_agendada;
  const planoMudanca = mudanca && planosMock.find((p) => p.id === mudanca.id_plano);

  const aoConcluirCancelamento = async (aceitouOferta) => {
    setCancelando(false);
    await recarregar();
    mostrar(aceitouOferta ? 'Oferta aplicada! A próxima cobrança sai com 50% de desconto.' : 'Assinatura cancelada.');
  };

  return (
    <>
      <TituloPagina titulo="Minha assinatura" acoes={<Botao variante="secundario" para="/planos">Ver planos</Botao>} />

      <section className={`${styles.cartao} ${styles.planoAtual}`}>
        <div>
          <span className={styles.rotulo}>Plano atual</span>
          <h2>{plano.nome}</h2>
          {assinatura && <span className={`${styles.status} ${styles[assinatura.status]}`}>{STATUS_ASSINATURA[assinatura.status]}</span>}
        </div>

        {premium && assinatura ? (
          <dl className={styles.detalhes}>
            <div>
              <dt>{assinatura.status === 'trial' ? 'Teste termina em' : assinatura.status === 'cancelada' ? 'Acesso até' : 'Renova em'}</dt>
              <dd>{dataIso(assinatura.data_expiracao)}</dd>
            </div>
            {assinatura.status === 'ativa' && (
              <div>
                <dt>Pagamento</dt>
                <dd>{assinatura.metodo_pagamento === 'cartao' && assinatura.cartao?.ultimos4 ? `Cartão final ${assinatura.cartao.ultimos4}` : METODO[assinatura.metodo_pagamento] || '—'}</dd>
              </div>
            )}
            {assinatura.cupom_proximo && (
              <div>
                <dt>Próxima cobrança</dt>
                <dd className={styles.positivo}>com 50% de desconto</dd>
              </div>
            )}
          </dl>
        ) : (
          <div className={styles.upsell}>
            <p>Catálogo ilimitado, todos os perfis do player, scanner e zero propagandas.</p>
            <AcoesUpsell />
          </div>
        )}

        {planoMudanca && (
          <Alerta tipo="info" titulo="Mudança agendada">
            Em {dataIso(mudanca.a_partir_de)} sua assinatura passa para {planoMudanca.nome}.{' '}
            <button type="button" className={styles.linkBotao} onClick={() => assinaturaService.desfazerMudancaAgendada().then(recarregar)}>
              Desfazer
            </button>
          </Alerta>
        )}

        {assinatura && (
          <div className={styles.acoes}>
            {emTrial && <Botao para={`/assinatura/checkout/${planoPorCodigo('premium_anual').codigo}`}>Assinar agora</Botao>}
            {assinatura.status === 'cancelada' ? (
              <Botao
                onClick={async () => {
                  await assinaturaService.reativar();
                  await recarregar();
                  mostrar('Assinatura reativada. Que bom que você ficou!');
                }}
              >
                Reativar assinatura
              </Botao>
            ) : (
              <>
                {!emTrial && <Botao variante="secundario" para="/planos">Mudar de plano</Botao>}
                <Botao variante="fantasma" onClick={() => setCancelando(true)}>
                  {emTrial ? 'Encerrar teste' : 'Cancelar assinatura'}
                </Botao>
              </>
            )}
          </div>
        )}
      </section>

      {plano.codigo === 'familia' && <Familia membros={membrosFamilia} aoMudar={recarregar} />}

      <section className={styles.cartao}>
        <h2>Histórico de pagamentos</h2>
        {transacoes.length === 0 ? (
          <p className={styles.muted}>Nenhum pagamento ainda.</p>
        ) : (
          <div className={styles.tabelaContainer}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Forma</th>
                  <th>Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t) => (
                  <tr key={t.id}>
                    <td>{formatarData(t.data_transacao)}</td>
                    <td>{t.descricao}</td>
                    <td>
                      {METODO[t.metodo_pagamento]}
                      {t.dados_pagamento?.ultimos4 && ` •${t.dados_pagamento.ultimos4}`}
                    </td>
                    <td>{formatarMoeda(t.valor)}</td>
                    <td>
                      {t.status === 'pendente' ? (
                        <Link to={`/assinatura/pagamento/${t.id}`}>Pendente — ver</Link>
                      ) : (
                        <span className={styles[`t_${t.status}`]}>{STATUS_TRANSACAO[t.status]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* key: cada abertura começa do passo 1 */}
      <FluxoCancelamento key={String(cancelando)} aberto={cancelando} emTrial={emTrial} aoFechar={() => setCancelando(false)} aoConcluir={aoConcluirCancelamento} />
    </>
  );
}
