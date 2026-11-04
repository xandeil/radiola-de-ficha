import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlano } from '@/contexts/PlanoContext';
import { useToast } from '@/contexts/ToastContext';
import { assinaturaService, cicloDoPlano, planoPorCodigo } from '@/services/assinaturaService';
import FormCartao from '@/components/assinatura/FormCartao';
import CartaoMercadoPago, { mercadoPagoConfigurado } from '@/components/assinatura/CartaoMercadoPago';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import Icone from '@/components/ui/Icone';
import { Entrada } from '@/components/ui/Campo';
import { Carregando } from '@/components/ui/Estados';
import { formatarData, formatarMoeda } from '@/utils/formatadores';
import { localizarPlano } from '@/mocks/assinatura';
import styles from '@/components/assinatura/Checkout.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Checkout (RF047–RF055 + integração Mercado Pago, seção 11.3).
 *
 * O resumo do pedido vem SEMPRE do servidor (cotacao). Nunca calcule o preço
 * final só no front: qualquer um muda um número no DevTools. O front mostra;
 * quem decide quanto cobrar é o back-end.
 */

const METODOS = ['cartao', 'pix', 'boleto'];

export default function CheckoutPage() {
  const { codigo } = useParams();
  const t = useT();
  const plano = localizarPlano(planoPorCodigo(codigo));
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const { recarregar } = usePlano();

  const [cupomDigitado, setCupomDigitado] = useState('');
  const [cupom, setCupom] = useState('');
  const [cotacao, setCotacao] = useState(null);
  const [erroCotacao, setErroCotacao] = useState('');
  const [erroCupom, setErroCupom] = useState('');
  const [metodo, setMetodo] = useState('cartao');
  const [comprovante, setComprovante] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState('');

  useEffect(() => {
    let cancelado = false;
    assinaturaService
      .cotacao(codigo, cupom)
      .then((c) => {
        if (cancelado) return;
        setCotacao(c);
        if (cupom) setErroCupom(''); // só limpa o erro quando um cupom novo deu certo
        setErroCotacao('');
      })
      .catch((e) => {
        if (cancelado) return;
        if (cupom) {
          setErroCupom(e.message);
          setCupom(''); // volta para a cotação sem cupom
        } else setErroCotacao(e.message);
      });
    return () => {
      cancelado = true;
    };
  }, [codigo, cupom]);

  const pagar = async (pagamento) => {
    setEnviando(true);
    setErroPagamento('');
    try {
      const resultado = await assinaturaService.pagar({ codigoPlano: codigo, cupom, pagamento, comprovante });
      if (resultado.agendado) {
        await recarregar();
        mostrar(t('assinatura.ck.agendada', { plano: plano.nome }));
        return navegar('/assinatura');
      }
      const { transacao } = resultado;
      if (transacao.status === 'recusada') {
        setErroPagamento(transacao.dados_pagamento.motivo);
        return;
      }
      await recarregar();
      navegar(`/assinatura/pagamento/${transacao.id}`);
    } catch (e) {
      setErroPagamento(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (erroCotacao) {
    return (
      <>
        <TituloPagina titulo={t('assinatura.ck.assinar')} />
        <Alerta tipo="aviso">{erroCotacao}</Alerta>
        <p><Link to="/planos">{t('assinatura.ck.voltarPlanos')}</Link></p>
      </>
    );
  }
  if (!cotacao) return <Carregando />;

  const anual = cicloDoPlano(plano) === 'anual';
  const parcelasMax = anual ? 3 : 1;
  const precisaComprovante = plano.exige_comprovante && !comprovante;

  return (
    <>
      <Link to="/planos" className={styles.voltar}>
        <Icone nome="voltar" tamanho={16} /> {t('assinatura.ck.planos')}
      </Link>
      <TituloPagina sobretitulo={t('assinatura.ck.sobretitulo')} titulo={t('assinatura.ck.assinarPlano', { plano: plano.nome })} subtitulo={plano.descricao} />

      <div className={styles.layout}>
        <section className={styles.pagamento}>
          {cotacao.agendado ? (
            <div className={styles.bloco}>
              <h2>{t('assinatura.ck.mudanca')}</h2>
              <p>{t('assinatura.ck.mudancaTexto', { plano: plano.nome, data: formatarData(`${cotacao.a_partir_de}T12:00:00`) })}</p>
              <Botao carregando={enviando} onClick={() => pagar({ metodo: 'agendamento' })}>
                {t('assinatura.ck.agendar')}
              </Botao>
            </div>
          ) : (
            <>
              {plano.exige_comprovante && (
                <div className={styles.bloco}>
                  <h2>{t('assinatura.ck.comprovante')}</h2>
                  <p className={styles.muted}>{t('assinatura.ck.comprovanteTexto')}</p>
                  <label className={styles.upload}>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        // Só o nome e o tamanho vão para o mock; no back real, o arquivo vai por upload (multipart)
                        if (arquivo) setComprovante({ nome: arquivo.name, tamanho: arquivo.size, status: 'em_analise' });
                      }}
                    />
                    <span>{comprovante ? `✓ ${comprovante.nome}` : t('assinatura.ck.escolherArquivo')}</span>
                  </label>
                </div>
              )}

              <div className={`${styles.bloco} ${precisaComprovante ? styles.desabilitado : ''}`} aria-disabled={precisaComprovante}>
                <h2>{t('assinatura.ck.forma')}</h2>
                <div className={styles.metodos} role="tablist">
                  {METODOS.map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={metodo === m} onClick={() => setMetodo(m)}>
                      {t(`assinatura.ck.metodo.${m}`)}
                    </button>
                  ))}
                </div>

                {erroPagamento && (
                  <Alerta tipo="erro" titulo={t('assinatura.ck.naoAprovado')} aoFechar={() => setErroPagamento('')}>
                    {erroPagamento}
                  </Alerta>
                )}

                {metodo === 'cartao' &&
                  (mercadoPagoConfigurado ? (
                    <CartaoMercadoPago valor={cotacao.total} parcelasMax={parcelasMax} aoEnviar={(cartao) => pagar({ metodo: 'cartao', cartao })} />
                  ) : (
                    <FormCartao valor={cotacao.total} parcelasMax={parcelasMax} carregando={enviando} aoEnviar={(cartao) => pagar({ metodo: 'cartao', cartao })} />
                  ))}

                {metodo === 'pix' && (
                  <div className={styles.alternativo}>
                    <p>{t('assinatura.ck.pixTexto')}</p>
                    <Botao tamanho="grande" carregando={enviando} onClick={() => pagar({ metodo: 'pix' })}>
                      {t('assinatura.ck.gerarPix', { valor: formatarMoeda(cotacao.total) })}
                    </Botao>
                  </div>
                )}

                {metodo === 'boleto' && (
                  <div className={styles.alternativo}>
                    <p>{t('assinatura.ck.boletoTexto')}</p>
                    <Botao tamanho="grande" carregando={enviando} onClick={() => pagar({ metodo: 'boleto' })}>
                      {t('assinatura.ck.gerarBoleto', { valor: formatarMoeda(cotacao.total) })}
                    </Botao>
                  </div>
                )}

                {!mercadoPagoConfigurado && <p className={styles.modoDemo}>{t('assinatura.ck.demo')}</p>}
              </div>
            </>
          )}
        </section>

        <aside className={styles.resumo}>
          <h2>{t('assinatura.ck.resumo')}</h2>
          <ul className={styles.linhas}>
            {cotacao.linhas.map((l) => (
              <li key={l.rotulo} className={l.valor < 0 ? styles.desconto : ''}>
                <span>{l.rotulo}</span>
                <span>{l.valor < 0 ? `− ${formatarMoeda(-l.valor)}` : formatarMoeda(l.valor)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.total}>
            <span>{t('assinatura.ck.totalHoje')}</span>
            <strong>{formatarMoeda(cotacao.total)}</strong>
          </div>
          {!cotacao.agendado && (
            <p className={styles.muted}>{anual ? t('assinatura.ck.renovaAnual') : t('assinatura.ck.renovaMensal')}</p>
          )}

          {!cotacao.agendado && (
            <form
              className={styles.cupom}
              onSubmit={(e) => {
                e.preventDefault();
                setErroCupom('');
                setCupom(cupomDigitado.trim());
              }}
            >
              <Entrada rotulo={t('assinatura.ck.cupom')} placeholder="RADIOLA10" value={cupomDigitado} onChange={(e) => setCupomDigitado(e.target.value.toUpperCase())} erro={erroCupom} />
              <Botao type="submit" variante="secundario" tamanho="pequeno" disabled={!cupomDigitado.trim()}>
                {t('assinatura.ck.aplicar')}
              </Botao>
            </form>
          )}
          {cotacao.cupom && <p className={styles.cupomOk}>{t('assinatura.ck.cupomOk', { cupom: cotacao.cupom })}</p>}
        </aside>
      </div>
    </>
  );
}
