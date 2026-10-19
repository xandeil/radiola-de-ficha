import { useEffect, useId, useRef, useState } from 'react';
import { Carregando } from '@/components/ui/Estados';

/*
 * Integração REAL com o Mercado Pago (Card Payment Brick).
 * Usado quando existe VITE_MP_PUBLIC_KEY no .env.
 *
 * O Brick é um formulário pronto, desenhado e hospedado pelo Mercado Pago,
 * que aparece dentro da nossa página. Ele mesmo valida o cartão e gera o
 * token; no onSubmit recebemos { token, payment_method_id, installments,
 * payer: { email, identification } } e mandamos isso para o NOSSO back-end,
 * que cria o pagamento com a chave secreta.
 *
 * Detalhe importante de React: o Brick precisa ser "desmontado" (unmount)
 * quando o componente sai da tela. Senão, ao voltar para a página, ele
 * tentaria se montar duas vezes no mesmo container.
 */

const CHAVE_PUBLICA = import.meta.env.VITE_MP_PUBLIC_KEY;
export const mercadoPagoConfigurado = Boolean(CHAVE_PUBLICA);

let sdkCarregando = null;
function carregarSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkCarregando) {
    sdkCarregando = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.mercadopago.com/js/v2';
      s.onload = resolve;
      s.onerror = () => {
        sdkCarregando = null;
        reject(new Error('Não foi possível carregar o Mercado Pago'));
      };
      document.head.appendChild(s);
    });
  }
  return sdkCarregando;
}

export default function CartaoMercadoPago({ valor, parcelasMax = 1, aoEnviar }) {
  const idContainer = `mp-brick-${useId().replace(/:/g, '')}`;
  const controlador = useRef(null);
  const aoEnviarRef = useRef(aoEnviar);
  aoEnviarRef.current = aoEnviar;
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    carregarSdk()
      .then(async () => {
        if (cancelado) return;
        const mp = new window.MercadoPago(CHAVE_PUBLICA, { locale: 'pt-BR' });
        controlador.current = await mp.bricks().create('cardPayment', idContainer, {
          initialization: { amount: valor },
          customization: { paymentMethods: { maxInstallments: parcelasMax } },
          callbacks: {
            onReady: () => !cancelado && setPronto(true),
            onError: (e) => console.error('Mercado Pago:', e),
            // Precisa devolver uma Promise: o Brick mostra "processando" até ela resolver
            onSubmit: (formData) =>
              aoEnviarRef.current({
                token: formData.token,
                bandeira: formData.payment_method_id,
                ultimos4: null, // o back-end obtém pela API do MP, se precisar
                parcelas: formData.installments,
                issuer_id: formData.issuer_id,
                pagador: formData.payer,
              }),
          },
        });
        if (cancelado) controlador.current?.unmount();
      })
      .catch((e) => !cancelado && setErro(e.message));

    return () => {
      cancelado = true;
      controlador.current?.unmount();
      controlador.current = null;
    };
  }, [valor, parcelasMax, idContainer]);

  return (
    <div>
      {!pronto && !erro && <Carregando texto="Carregando o Mercado Pago..." />}
      {erro && <p role="alert">{erro}</p>}
      <div id={idContainer} />
    </div>
  );
}
