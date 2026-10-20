import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { usePlano } from '@/contexts/PlanoContext';
import { useToast } from '@/contexts/ToastContext';
import { USE_MOCK } from '@/services/api';
import { assinaturaService } from '@/services/assinaturaService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import { formatarData, formatarMoeda } from '@/utils/formatadores';
import styles from './Pagamento.module.css';
import { useT } from '@/contexts/I18nContext';

/*
 * Situação de um pagamento: aprovado, Pix aguardando, boleto aguardando
 * ou cartão em análise.
 *
 * POLLING: enquanto está pendente, perguntamos ao servidor a cada 3 segundos
 * "já foi pago?". É simples e funciona bem para Pix. (Alternativas mais
 * elaboradas: WebSocket ou Server-Sent Events, em que o servidor avisa.)
 * O setInterval é limpo quando o pagamento muda de status ou a tela fecha.
 */

const INTERVALO_POLLING = 3000;

function Copiar({ texto, rotulo }) {
  const { mostrar } = useToast();
  const t = useT();
  return (
    <Botao
      variante="secundario"
      tamanho="pequeno"
      onClick={() =>
        navigator.clipboard
          .writeText(texto)
          .then(() => mostrar(t('assinatura.pg.copiado', { rotulo })))
          .catch(() => mostrar(t('assinatura.pg.copieManual'), { tipo: 'erro' }))
      }
    >
      {t('assinatura.pg.copiar', { rotulo: rotulo.toLowerCase() })}
    </Botao>
  );
}

function Contagem({ ate }) {
  const t = useT();
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);
  const resta = Math.max(0, new Date(ate).getTime() - agora);
  const m = Math.floor(resta / 60000);
  const s = String(Math.floor((resta % 60000) / 1000)).padStart(2, '0');
  return <span className={styles.contagem}>{resta ? t('assinatura.pg.expiraEm', { tempo: `${m}:${s}` }) : t('assinatura.pg.pixExpirado')}</span>;
}

export default function PagamentoPage() {
  const t = useT();
  const { id } = useParams();
  const { recarregar } = usePlano();
  const { mostrar } = useToast();
  const [transacao, setTransacao] = useState(null);
  const [erro, setErro] = useState(null);
  const [qr, setQr] = useState('');
  const [simulando, setSimulando] = useState(false);

  useEffect(() => {
    assinaturaService.statusPagamento(id).then(setTransacao).catch(setErro);
  }, [id]);

  // Polling enquanto pendente
  useEffect(() => {
    if (transacao?.status !== 'pendente') return;
    const timer = setInterval(async () => {
      const atual = await assinaturaService.statusPagamento(id).catch(() => null);
      if (atual && atual.status !== 'pendente') setTransacao(atual);
    }, INTERVALO_POLLING);
    return () => clearInterval(timer);
  }, [transacao?.status, id]);

  // Quando aprova, atualiza o plano no app inteiro (some a propaganda, libera recursos)
  useEffect(() => {
    if (transacao?.status === 'aprovada') recarregar();
  }, [transacao?.status, recarregar]);

  // QR Code do Pix gerado no navegador a partir do "copia e cola"
  useEffect(() => {
    const codigo = transacao?.dados_pagamento?.copia_cola;
    if (codigo) QRCode.toDataURL(codigo, { width: 240, margin: 1 }).then(setQr);
  }, [transacao?.dados_pagamento?.copia_cola]);

  const simularWebhook = async () => {
    setSimulando(true);
    setTransacao(await assinaturaService.simularConfirmacao(id));
    setSimulando(false);
    mostrar(t('assinatura.pg.webhook'));
  };

  if (erro) return <EstadoErro erro={erro} />;
  if (!transacao) return <Carregando />;

  const d = transacao.dados_pagamento;

  return (
    <>
      <TituloPagina sobretitulo={t('assinatura.ck.sobretitulo')} titulo={transacao.status === 'aprovada' ? t('assinatura.pg.tudoCerto') : t('assinatura.pg.andamento')} subtitulo={`${transacao.descricao} · ${formatarMoeda(transacao.valor)}`} />

      <section className={styles.cartao}>
        {transacao.status === 'aprovada' && (
          <div className={styles.sucesso}>
            <span className={styles.disco} aria-hidden="true" />
            <h2>{t('assinatura.pg.bemVindo', { plano: transacao.descricao })}</h2>
            <p>{t('assinatura.pg.liberados')}</p>
            <div className={styles.acoes}>
              <Botao para="/player">{t('assinatura.pg.abrirVitrola')}</Botao>
              <Botao variante="secundario" para="/assinatura">{t('assinatura.pg.verAssinatura')}</Botao>
            </div>
          </div>
        )}

        {transacao.status === 'recusada' && (
          <Alerta tipo="erro" titulo={t('assinatura.pg.recusado')}>
            {d.motivo} <Link to={`/assinatura/checkout/${d.plano}`}>{t('assinatura.pg.tentarNovamente')}</Link>
          </Alerta>
        )}

        {transacao.status === 'pendente' && transacao.metodo_pagamento === 'pix' && (
          <div className={styles.pix}>
            {qr ? <img src={qr} alt={t('assinatura.pg.qrAlt')} width={240} height={240} /> : <Carregando />}
            <div className={styles.instrucoes}>
              <h2>{t('assinatura.pg.pagueComPix')}</h2>
              <ol>
                <li>{t('assinatura.pg.pix1')}</li>
                <li>{t('assinatura.pg.pix2')}</li>
                <li>{t('assinatura.pg.pix3')}</li>
              </ol>
              <code className={styles.codigo}>{d.copia_cola}</code>
              <div className={styles.acoes}>
                <Copiar texto={d.copia_cola} rotulo={t('assinatura.pg.codigoPix')} />
                <Contagem ate={d.expira_em} />
              </div>
              <p className={styles.esperando}>
                <span className={styles.pulso} aria-hidden="true" /> {t('assinatura.pg.aguardando')}
              </p>
            </div>
          </div>
        )}

        {transacao.status === 'pendente' && transacao.metodo_pagamento === 'boleto' && (
          <div className={styles.instrucoes}>
            <h2>{t('assinatura.pg.boletoGerado')}</h2>
            <p>{t('assinatura.pg.vencimento')} <strong>{formatarData(`${d.vencimento}T12:00:00`)}</strong>. {t('assinatura.pg.ondePagar')}</p>
            <code className={styles.codigo}>{d.linha_digitavel}</code>
            <div className={styles.acoes}>
              <Copiar texto={d.linha_digitavel.replace(/\D/g, '')} rotulo={t('assinatura.pg.codigoBarras')} />
            </div>
            <p className={styles.esperando}>{t('assinatura.pg.compensacao')}</p>
          </div>
        )}

        {transacao.status === 'pendente' && transacao.metodo_pagamento === 'cartao' && (
          <Alerta tipo="info" titulo={t('assinatura.pg.analise')}>
            {t('assinatura.pg.analiseTexto', { ultimos4: d.ultimos4 })}
          </Alerta>
        )}

        {transacao.status === 'pendente' && USE_MOCK && (
          <div className={styles.simulacao}>
            <p>
              <strong>{t('assinatura.pg.demoTitulo')}</strong> {t('assinatura.pg.demoTexto')}
            </p>
            <Botao variante="secundario" tamanho="pequeno" carregando={simulando} onClick={simularWebhook}>
              {t('assinatura.pg.simular')}
            </Botao>
          </div>
        )}
      </section>
    </>
  );
}
