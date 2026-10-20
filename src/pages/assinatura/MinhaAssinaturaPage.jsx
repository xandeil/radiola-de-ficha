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
import { useT } from '@/contexts/I18nContext';

/*
 * RF051–RF053 – Painel da assinatura: plano, renovação, histórico,
 * mudança de plano, cancelamento (com oferta de retenção, seção 9.4)
 * e membros do plano Família (RF049).
 */

// O VALOR vai para o banco (relatório de churn); o rótulo vem do dicionário
const MOTIVOS = ['preco', 'falta_uso', 'dificuldade', 'problemas_tecnicos', 'mudou_streaming', 'outro'];

const dataIso = (iso) => (iso ? formatarData(`${iso.slice(0, 10)}T12:00:00`) : '—');

/** Cancelamento em 3 passos: motivo -> oferta de retenção -> confirmação. */
function FluxoCancelamento({ aberto, emTrial, aoFechar, aoConcluir }) {
  const t = useT();
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
    <Modal aberto={aberto} titulo={passo === 2 ? t('assinatura.ma.antesDeIr') : t('assinatura.ma.cancelarAssinatura')} aoFechar={aoFechar}>
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {passo === 1 && (
        <div className={styles.passo}>
          <p>{t('assinatura.ma.quePena')}</p>
          <Selecao rotulo={t('assinatura.ma.motivoPrincipal')} vazio={t('comum.selecione')} opcoes={MOTIVOS.map((m) => ({ valor: m, rotulo: t(`assinatura.ma.motivo.${m}`) }))} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <AreaTexto rotulo={t('assinatura.ma.contarMais')} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={500} />
          <div className={styles.acoesModal}>
            <Botao variante="secundario" onClick={aoFechar}>{t('assinatura.ma.voltar')}</Botao>
            <Botao variante="perigo" disabled={!motivo} onClick={() => (ofertaFazSentido ? setPasso(2) : setPasso(3))}>
              {t('assinatura.ma.continuar')}
            </Botao>
          </div>
        </div>
      )}
      {passo === 2 && (
        <div className={styles.passo}>
          <div className={styles.oferta}>
            <strong>{t('assinatura.ma.ofertaTitulo')}</strong>
            <span>{t('assinatura.ma.ofertaTexto')}</span>
          </div>
          <div className={styles.acoesModal}>
            <Botao variante="fantasma" onClick={() => setPasso(3)}>{t('assinatura.ma.naoQuero')}</Botao>
            <Botao carregando={enviando} onClick={() => enviar(true)}>{t('assinatura.ma.aceitar')}</Botao>
          </div>
        </div>
      )}
      {passo === 3 && (
        <div className={styles.passo}>
          <p>
            {emTrial
              ? t('assinatura.ma.fimTrial')
              : t('assinatura.ma.fimPeriodo')}
          </p>
          <div className={styles.acoesModal}>
            <Botao variante="secundario" onClick={aoFechar}>{t('assinatura.ma.manter')}</Botao>
            <Botao variante="perigo" carregando={enviando} onClick={() => enviar(false)}>{t('assinatura.ma.confirmarCancel')}</Botao>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Familia({ membros, aoMudar }) {
  const { mostrar } = useToast();
  const t = useT();
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
      mostrar(t('assinatura.ma.conviteEnviado', { email }));
      aoMudar();
    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <section className={styles.cartao}>
      <h2>{t('assinatura.ma.familia', { n: membros.length + 1 })}</h2>
      <p className={styles.muted}>{t('assinatura.ma.familiaTexto')}</p>
      <ul className={styles.membros}>
        <li><strong>{t('assinatura.ma.voce')}</strong> <span>{t('assinatura.ma.titular')}</span></li>
        {membros.map((m) => (
          <li key={m.id}>
            <span>{m.email}</span>
            <span>{m.status === 'convidado' ? t('assinatura.ma.conviteStatus') : t('assinatura.ma.ativo')}</span>
            <button type="button" onClick={() => assinaturaService.removerMembroFamilia(m.id).then(aoMudar)} aria-label={t('assinatura.ma.removerX', { email: m.email })}>
              {t('assinatura.ma.remover')}
            </button>
          </li>
        ))}
      </ul>
      {membros.length < 4 && (
        <form className={styles.convite} onSubmit={adicionar} noValidate>
          <Entrada type="email" aria-label={t('assinatura.ma.emailMembro')} placeholder="email@familia.com" value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
          <Botao type="submit" variante="secundario">{t('assinatura.ma.convidar')}</Botao>
        </form>
      )}
    </section>
  );
}

export default function MinhaAssinaturaPage() {
  const { carregado, plano, assinatura, premium, emTrial, transacoes, membrosFamilia, recarregar } = usePlano();
  const { mostrar } = useToast();
  const t = useT();
  const [cancelando, setCancelando] = useState(false);

  if (!carregado) return <Carregando />;

  const mudanca = assinatura?.mudanca_agendada;
  const planoMudanca = mudanca && planosMock.find((p) => p.id === mudanca.id_plano);

  const aoConcluirCancelamento = async (aceitouOferta) => {
    setCancelando(false);
    await recarregar();
    mostrar(aceitouOferta ? t('assinatura.ma.ofertaAplicada') : t('assinatura.ma.cancelada'));
  };

  return (
    <>
      <TituloPagina titulo={t('assinatura.ma.titulo')} acoes={<Botao variante="secundario" para="/planos">{t('assinatura.verPlanos')}</Botao>} />

      <section className={`${styles.cartao} ${styles.planoAtual}`}>
        <div>
          <span className={styles.rotulo}>{t('assinatura.ma.planoAtual')}</span>
          <h2>{plano.nome}</h2>
          {assinatura && <span className={`${styles.status} ${styles[assinatura.status]}`}>{t(`assinatura.ma.status.${assinatura.status}`)}</span>}
        </div>

        {premium && assinatura ? (
          <dl className={styles.detalhes}>
            <div>
              <dt>{assinatura.status === 'trial' ? t('assinatura.ma.testeTermina') : assinatura.status === 'cancelada' ? t('assinatura.ma.acessoAte') : t('assinatura.ma.renovaEm')}</dt>
              <dd>{dataIso(assinatura.data_expiracao)}</dd>
            </div>
            {assinatura.status === 'ativa' && (
              <div>
                <dt>{t('assinatura.ma.pagamento')}</dt>
                <dd>{assinatura.metodo_pagamento === 'cartao' && assinatura.cartao?.ultimos4 ? t('assinatura.ma.cartaoFinal', { n: assinatura.cartao.ultimos4 }) : assinatura.metodo_pagamento ? t(`assinatura.ma.metodo.${assinatura.metodo_pagamento}`) : '—'}</dd>
              </div>
            )}
            {assinatura.cupom_proximo && (
              <div>
                <dt>{t('assinatura.ma.proximaCobranca')}</dt>
                <dd className={styles.positivo}>{t('assinatura.ma.com50')}</dd>
              </div>
            )}
          </dl>
        ) : (
          <div className={styles.upsell}>
            <p>{t('assinatura.ma.upsell')}</p>
            <AcoesUpsell />
          </div>
        )}

        {planoMudanca && (
          <Alerta tipo="info" titulo={t('assinatura.ma.mudancaAgendada')}>
            {t('assinatura.ma.mudancaTexto', { data: dataIso(mudanca.a_partir_de), plano: planoMudanca.nome })}{' '}
            <button type="button" className={styles.linkBotao} onClick={() => assinaturaService.desfazerMudancaAgendada().then(recarregar)}>
              {t('assinatura.ma.desfazer')}
            </button>
          </Alerta>
        )}

        {assinatura && (
          <div className={styles.acoes}>
            {emTrial && <Botao para={`/assinatura/checkout/${planoPorCodigo('premium_anual').codigo}`}>{t('assinatura.ma.assinarAgora')}</Botao>}
            {assinatura.status === 'cancelada' ? (
              <Botao
                onClick={async () => {
                  await assinaturaService.reativar();
                  await recarregar();
                  mostrar(t('assinatura.ma.reativada'));
                }}
              >
                {t('assinatura.ma.reativar')}
              </Botao>
            ) : (
              <>
                {!emTrial && <Botao variante="secundario" para="/planos">{t('assinatura.ma.mudarPlano')}</Botao>}
                <Botao variante="fantasma" onClick={() => setCancelando(true)}>
                  {emTrial ? t('assinatura.ma.encerrarTeste') : t('assinatura.ma.cancelarAssinatura')}
                </Botao>
              </>
            )}
          </div>
        )}
      </section>

      {plano.codigo === 'familia' && <Familia membros={membrosFamilia} aoMudar={recarregar} />}

      <section className={styles.cartao}>
        <h2>{t('assinatura.ma.historico')}</h2>
        {transacoes.length === 0 ? (
          <p className={styles.muted}>{t('assinatura.ma.nenhumPagamento')}</p>
        ) : (
          <div className={styles.tabelaContainer}>
            <table>
              <thead>
                <tr>
                  <th>{t('assinatura.ma.col.data')}</th>
                  <th>{t('assinatura.ma.col.descricao')}</th>
                  <th>{t('assinatura.ma.col.forma')}</th>
                  <th>{t('assinatura.ma.col.valor')}</th>
                  <th>{t('assinatura.ma.col.situacao')}</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((tr) => (
                  <tr key={tr.id}>
                    <td>{formatarData(tr.data_transacao)}</td>
                    <td>{tr.descricao}</td>
                    <td>
                      {t(`assinatura.ma.metodo.${tr.metodo_pagamento}`)}
                      {tr.dados_pagamento?.ultimos4 && ` •${tr.dados_pagamento.ultimos4}`}
                    </td>
                    <td>{formatarMoeda(tr.valor)}</td>
                    <td>
                      {tr.status === 'pendente' ? (
                        <Link to={`/assinatura/pagamento/${tr.id}`}>{t('assinatura.ma.pendenteVer')}</Link>
                      ) : (
                        <span className={styles[`t_${tr.status}`]}>{t(`assinatura.ma.transacao.${tr.status}`)}</span>
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
