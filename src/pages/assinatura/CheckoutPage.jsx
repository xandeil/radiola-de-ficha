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
import { formatarMoeda } from '@/utils/formatadores';
import styles from '@/components/assinatura/Checkout.module.css';

/*
 * Checkout (RF047–RF055 + integração Mercado Pago, seção 11.3).
 *
 * O resumo do pedido vem SEMPRE do servidor (cotacao). Nunca calcule o preço
 * final só no front: qualquer um muda um número no DevTools. O front mostra;
 * quem decide quanto cobrar é o back-end.
 */

const METODOS = [
  { id: 'cartao', rotulo: 'Cartão de crédito' },
  { id: 'pix', rotulo: 'Pix' },
  { id: 'boleto', rotulo: 'Boleto' },
];

export default function CheckoutPage() {
  const { codigo } = useParams();
  const plano = planoPorCodigo(codigo);
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
        mostrar(`Mudança para ${plano.nome} agendada para o fim do período atual.`);
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
        <TituloPagina titulo="Assinar" />
        <Alerta tipo="aviso">{erroCotacao}</Alerta>
        <p><Link to="/planos">Voltar aos planos</Link></p>
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
        <Icone nome="voltar" tamanho={16} /> Planos
      </Link>
      <TituloPagina sobretitulo="Assinatura" titulo={`Assinar ${plano.nome}`} subtitulo={plano.descricao} />

      <div className={styles.layout}>
        <section className={styles.pagamento}>
          {cotacao.agendado ? (
            <div className={styles.bloco}>
              <h2>Mudança de plano</h2>
              <p>
                O {plano.nome} é mais barato que o seu plano atual. A troca acontece em <strong>{cotacao.a_partir_de.split('-').reverse().join('/')}</strong>,
                quando termina o período já pago. Nada é cobrado agora.
              </p>
              <Botao carregando={enviando} onClick={() => pagar({ metodo: 'agendamento' })}>
                Agendar mudança
              </Botao>
            </div>
          ) : (
            <>
              {plano.exige_comprovante && (
                <div className={styles.bloco}>
                  <h2>Comprovante de matrícula</h2>
                  <p className={styles.muted}>RF050: o desconto exige comprovante, renovado todo ano. Aceita PDF ou foto.</p>
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
                    <span>{comprovante ? `✓ ${comprovante.nome}` : 'Escolher arquivo'}</span>
                  </label>
                </div>
              )}

              <div className={`${styles.bloco} ${precisaComprovante ? styles.desabilitado : ''}`} aria-disabled={precisaComprovante}>
                <h2>Forma de pagamento</h2>
                <div className={styles.metodos} role="tablist">
                  {METODOS.map((m) => (
                    <button key={m.id} type="button" role="tab" aria-selected={metodo === m.id} onClick={() => setMetodo(m.id)}>
                      {m.rotulo}
                    </button>
                  ))}
                </div>

                {erroPagamento && (
                  <Alerta tipo="erro" titulo="Pagamento não aprovado" aoFechar={() => setErroPagamento('')}>
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
                    <p>O QR Code aparece na próxima tela e vale por 30 minutos. A assinatura ativa assim que o Pix for confirmado — geralmente em segundos.</p>
                    <Botao tamanho="grande" carregando={enviando} onClick={() => pagar({ metodo: 'pix' })}>
                      Gerar Pix de {formatarMoeda(cotacao.total)}
                    </Botao>
                  </div>
                )}

                {metodo === 'boleto' && (
                  <div className={styles.alternativo}>
                    <p>O boleto vence em 3 dias úteis. A compensação leva até 2 dias úteis depois do pagamento.</p>
                    <Botao tamanho="grande" carregando={enviando} onClick={() => pagar({ metodo: 'boleto' })}>
                      Gerar boleto de {formatarMoeda(cotacao.total)}
                    </Botao>
                  </div>
                )}

                {!mercadoPagoConfigurado && <p className={styles.modoDemo}>Modo demonstração: nenhum valor é cobrado de verdade.</p>}
              </div>
            </>
          )}
        </section>

        <aside className={styles.resumo}>
          <h2>Resumo</h2>
          <ul className={styles.linhas}>
            {cotacao.linhas.map((l) => (
              <li key={l.rotulo} className={l.valor < 0 ? styles.desconto : ''}>
                <span>{l.rotulo}</span>
                <span>{l.valor < 0 ? `− ${formatarMoeda(-l.valor)}` : formatarMoeda(l.valor)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.total}>
            <span>Total hoje</span>
            <strong>{formatarMoeda(cotacao.total)}</strong>
          </div>
          {!cotacao.agendado && (
            <p className={styles.muted}>
              Renova a cada {anual ? '12 meses' : 'mês'}. Cancele quando quiser.
            </p>
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
              <Entrada rotulo="Cupom de desconto" placeholder="RADIOLA10" value={cupomDigitado} onChange={(e) => setCupomDigitado(e.target.value.toUpperCase())} erro={erroCupom} />
              <Botao type="submit" variante="secundario" tamanho="pequeno" disabled={!cupomDigitado.trim()}>
                Aplicar
              </Botao>
            </form>
          )}
          {cotacao.cupom && <p className={styles.cupomOk}>✓ Cupom {cotacao.cupom} aplicado</p>}
        </aside>
      </div>
    </>
  );
}
