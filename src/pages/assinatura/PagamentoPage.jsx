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
  return (
    <Botao
      variante="secundario"
      tamanho="pequeno"
      onClick={() =>
        navigator.clipboard
          .writeText(texto)
          .then(() => mostrar(`${rotulo} copiado`))
          .catch(() => mostrar('Selecione o texto e copie manualmente', { tipo: 'erro' }))
      }
    >
      Copiar {rotulo.toLowerCase()}
    </Botao>
  );
}

function Contagem({ ate }) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const resta = Math.max(0, new Date(ate).getTime() - agora);
  const m = Math.floor(resta / 60000);
  const s = String(Math.floor((resta % 60000) / 1000)).padStart(2, '0');
  return <span className={styles.contagem}>{resta ? `Expira em ${m}:${s}` : 'Pix expirado — gere outro'}</span>;
}

export default function PagamentoPage() {
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
    mostrar('Webhook simulado: o Mercado Pago avisou que o pagamento caiu.');
  };

  if (erro) return <EstadoErro erro={erro} />;
  if (!transacao) return <Carregando />;

  const d = transacao.dados_pagamento;

  return (
    <>
      <TituloPagina sobretitulo="Assinatura" titulo={transacao.status === 'aprovada' ? 'Tudo certo!' : 'Pagamento em andamento'} subtitulo={`${transacao.descricao} · ${formatarMoeda(transacao.valor)}`} />

      <section className={styles.cartao}>
        {transacao.status === 'aprovada' && (
          <div className={styles.sucesso}>
            <span className={styles.disco} aria-hidden="true" />
            <h2>Bem-vindo à {transacao.descricao}</h2>
            <p>Os recursos Premium já estão liberados e as propagandas sumiram.</p>
            <div className={styles.acoes}>
              <Botao para="/player">Abrir a vitrola</Botao>
              <Botao variante="secundario" para="/assinatura">Ver minha assinatura</Botao>
            </div>
          </div>
        )}

        {transacao.status === 'recusada' && (
          <Alerta tipo="erro" titulo="Pagamento recusado">
            {d.motivo} <Link to={`/assinatura/checkout/${d.plano}`}>Tentar novamente</Link>
          </Alerta>
        )}

        {transacao.status === 'pendente' && transacao.metodo_pagamento === 'pix' && (
          <div className={styles.pix}>
            {qr ? <img src={qr} alt="QR Code do Pix" width={240} height={240} /> : <Carregando />}
            <div className={styles.instrucoes}>
              <h2>Pague com Pix</h2>
              <ol>
                <li>Abra o app do seu banco e escolha Pix → Pagar com QR Code.</li>
                <li>Aponte para o código ao lado, ou use o "copia e cola".</li>
                <li>Pronto: esta tela atualiza sozinha quando o pagamento cair.</li>
              </ol>
              <code className={styles.codigo}>{d.copia_cola}</code>
              <div className={styles.acoes}>
                <Copiar texto={d.copia_cola} rotulo="Código Pix" />
                <Contagem ate={d.expira_em} />
              </div>
              <p className={styles.esperando}>
                <span className={styles.pulso} aria-hidden="true" /> Aguardando confirmação do banco...
              </p>
            </div>
          </div>
        )}

        {transacao.status === 'pendente' && transacao.metodo_pagamento === 'boleto' && (
          <div className={styles.instrucoes}>
            <h2>Boleto gerado</h2>
            <p>Vencimento: <strong>{formatarData(`${d.vencimento}T12:00:00`)}</strong>. Pague no app do banco, lotérica ou internet banking.</p>
            <code className={styles.codigo}>{d.linha_digitavel}</code>
            <div className={styles.acoes}>
              <Copiar texto={d.linha_digitavel.replace(/\D/g, '')} rotulo="Código de barras" />
            </div>
            <p className={styles.esperando}>A compensação leva até 2 dias úteis. Você recebe um e-mail quando confirmar.</p>
          </div>
        )}

        {transacao.status === 'pendente' && transacao.metodo_pagamento === 'cartao' && (
          <Alerta tipo="info" titulo="Pagamento em análise">
            O banco está analisando a compra do cartão final {d.ultimos4}. Isso costuma levar poucos minutos; esta tela atualiza sozinha.
          </Alerta>
        )}

        {transacao.status === 'pendente' && USE_MOCK && (
          <div className={styles.simulacao}>
            <p>
              <strong>Modo demonstração.</strong> Num sistema real, quem confirma é o <em>webhook</em> do Mercado Pago chamando o back-end.
            </p>
            <Botao variante="secundario" tamanho="pequeno" carregando={simulando} onClick={simularWebhook}>
              Simular pagamento confirmado
            </Botao>
          </div>
        )}
      </section>
    </>
  );
}
