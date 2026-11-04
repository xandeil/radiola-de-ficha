import { useState } from 'react';
import { Entrada, Selecao } from '@/components/ui/Campo';
import Botao from '@/components/ui/Botao';
import {
  cpfValido,
  detectarBandeira,
  formatarCpf,
  formatarNumeroCartao,
  formatarValidade,
  luhnValido,
  soDigitos,
  validadeOk,
} from '@/utils/pagamento';
import { formatarMoeda } from '@/utils/formatadores';
import * as validar from '@/utils/validadores';
import styles from './Checkout.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Formulário de cartão SIMULADO (modo sem VITE_MP_PUBLIC_KEY).
 *
 * Ele imita o que o SDK do Mercado Pago faz de verdade:
 *   1. valida tudo no navegador (Luhn, validade, CVV, CPF);
 *   2. "tokeniza": troca os dados do cartão por um token descartável;
 *   3. entrega para cima SÓ o token + bandeira + 4 últimos dígitos.
 * O número completo e o CVV morrem aqui dentro — nem o estado do
 * componente pai os vê. É a mesma garantia que o Brick real dá.
 *
 * Cartões de teste (como os do Mercado Pago):
 *   Mastercard 5031 4332 1540 6351 · Visa 4235 6477 2802 5682 · validade futura · CVV 123
 *   Nome do titular decide o resultado: APRO = aprovado, OTHE = recusado, CONT = pendente.
 */
export default function FormCartao({ valor, parcelasMax = 1, carregando, aoEnviar }) {
  const t = useT();
  const [f, setF] = useState({ numero: '', titular: '', validade: '', cvv: '', cpf: '', email: '', parcelas: '1' });
  const [erros, setErros] = useState({});
  const bandeira = detectarBandeira(f.numero);
  // Ao corrigir um campo, o erro dele some na hora (o usuário vê que acertou)
  const mudar = (campo, formatar = (v) => v) => (e) => {
    setF({ ...f, [campo]: formatar(e.target.value) });
    if (erros[campo]) setErros(({ [campo]: _, ...resto }) => resto);
  };

  const enviar = async (e) => {
    e.preventDefault();
    const novos = validar.limparErros({
      numero: luhnValido(f.numero) ? null : t('assinatura.cartao.numeroInvalido'),
      titular: validar.obrigatorio(f.titular, t('assinatura.cartao.nomeTitular')),
      validade: validadeOk(f.validade) ? null : t('assinatura.cartao.validadeInvalida'),
      cvv: soDigitos(f.cvv).length === (bandeira?.cvv || 3) ? null : t('assinatura.cartao.cvvDigitos', { n: bandeira?.cvv || 3 }),
      cpf: cpfValido(f.cpf) ? null : t('assinatura.cartao.cpfInvalido'),
      email: validar.email(f.email),
    });
    setErros(novos);
    if (Object.keys(novos).length) return;

    // "Tokenização" simulada: no Brick real, quem gera isso é o Mercado Pago
    const token = `tok_demo_${Math.random().toString(36).slice(2, 12)}`;
    const ultimos4 = soDigitos(f.numero).slice(-4);
    await aoEnviar({
      token,
      bandeira: bandeira?.id || 'desconhecida',
      ultimos4,
      parcelas: Number(f.parcelas),
      titular: f.titular,
      pagador: { email: f.email, cpf: soDigitos(f.cpf) },
    });
  };

  const opcoesParcelas = Array.from({ length: parcelasMax }, (_, i) => ({
    valor: String(i + 1),
    rotulo: t('assinatura.cartao.parcela', { n: i + 1, valor: formatarMoeda(valor / (i + 1)) }),
  }));

  return (
    <form className={styles.formCartao} onSubmit={enviar} noValidate autoComplete="on">
      <div className={styles.cartaoVisual} data-bandeira={bandeira?.id || ''} aria-hidden="true">
        <span className={styles.chip} />
        <span className={styles.numeroVisual}>{f.numero || '•••• •••• •••• ••••'}</span>
        <span className={styles.rodapeVisual}>
          <span>{f.titular.toUpperCase() || t('assinatura.cartao.nomeVisual')}</span>
          <span>{f.validade || t('assinatura.cartao.mmaa')}</span>
        </span>
        <span className={styles.bandeiraVisual}>{bandeira?.nome || ''}</span>
      </div>

      <Entrada
        className={styles.largo}
        rotulo={t('assinatura.cartao.numero')}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        value={f.numero}
        onChange={mudar('numero', formatarNumeroCartao)}
        erro={erros.numero}
        dica={bandeira ? bandeira.nome : t('assinatura.cartao.teste')}
      />
      <Entrada className={styles.largo} rotulo={t('assinatura.cartao.nomeImpresso')} autoComplete="cc-name" value={f.titular} onChange={mudar('titular')} erro={erros.titular} dica={t('assinatura.cartao.nomeDica')} />
      <Entrada rotulo={t('assinatura.cartao.validade')} inputMode="numeric" autoComplete="cc-exp" placeholder={t('assinatura.cartao.mmaa')} value={f.validade} onChange={mudar('validade', formatarValidade)} erro={erros.validade} />
      <Entrada rotulo="CVV" inputMode="numeric" autoComplete="cc-csc" placeholder={bandeira?.cvv === 4 ? '0000' : '000'} value={f.cvv} onChange={mudar('cvv', (v) => soDigitos(v).slice(0, 4))} erro={erros.cvv} />
      <Entrada rotulo={t('assinatura.cartao.cpf')} inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={mudar('cpf', formatarCpf)} erro={erros.cpf} />
      <Entrada rotulo={t('assinatura.cartao.email')} type="email" autoComplete="email" value={f.email} onChange={mudar('email')} erro={erros.email} />
      {parcelasMax > 1 && <Selecao className={styles.largo} rotulo={t('assinatura.cartao.parcelas')} vazio={null} opcoes={opcoesParcelas} value={f.parcelas} onChange={mudar('parcelas')} />}

      <div className={styles.largo}>
        <Botao type="submit" tamanho="grande" carregando={carregando} className={styles.botaoPagar}>
          {t('assinatura.cartao.pagar', { valor: formatarMoeda(valor) })}
        </Botao>
        <p className={styles.seguranca}>{t('assinatura.cartao.seguranca')}</p>
      </div>
    </form>
  );
}
