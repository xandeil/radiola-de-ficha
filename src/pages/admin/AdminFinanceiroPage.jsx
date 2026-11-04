import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { adminService } from '@/services/adminService';
import { temPermissao } from '@/utils/permissoes';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Modal from '@/components/ui/Modal';
import { AreaTexto } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import GraficoBarras from '@/components/admin/GraficoBarras';
import { formatarData, formatarMoeda } from '@/utils/formatadores';
import styles from './Admin.module.css';

const TOM = { aprovada: 'sucesso', pendente: 'aviso', recusada: 'erro', reembolsada: 'neutro' };

/*
 * Financeiro: transações e reembolso. Reembolsar é ação "de dinheiro",
 * então pede confirmação com motivo e exige a permissão
 * assinaturas.reembolsar (o suporte vê, mas não reembolsa).
 */
export default function AdminFinanceiroPage() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const { dados: d, carregando, erro, recarregar } = useCarregar(() => adminService.financeiro(), []);
  const [alvo, setAlvo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const podeReembolsar = temPermissao(usuario, 'assinaturas.reembolsar');

  if (carregando && !d) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  // Motivos de cancelamento agrupados (pergunta: "por que estão saindo?")
  const motivos = Object.entries(
    d.motivosCancelamento.reduce((acc, m) => ({ ...acc, [m.motivo_principal]: (acc[m.motivo_principal] || 0) + 1 }), {}),
  ).map(([motivo, total]) => ({ motivo, total })).sort((a, b) => b.total - a.total);

  const reembolsar = async () => {
    setSalvando(true);
    try {
      await adminService.reembolsar(alvo.id, motivo.trim());
      mostrar('Reembolso feito e acesso pago encerrado');
      setAlvo(null);
      setMotivo('');
      recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="Financeiro" subtitulo="Pagamentos recebidos pelo Mercado Pago." />
      <div className={styles.blocos}>
        <div className={styles.bloco}><small>Recebido</small><strong>{formatarMoeda(d.receitaTotal)}</strong></div>
        <div className={styles.bloco}><small>Reembolsado</small><strong>{formatarMoeda(d.reembolsado)}</strong></div>
        <div className={styles.bloco}><small>Pendentes</small><strong>{d.pendentes}</strong><span>Pix e boletos aguardando</span></div>
      </div>

      {motivos.length > 0 && (
        <div className={styles.graficos}>
          <GraficoBarras titulo="Por que cancelaram" dados={motivos} rotulo={(m) => m.motivo} valor={(m) => m.total} horizontal />
        </div>
      )}

      <section className={styles.cartao}>
        <h2>Transações</h2>
        <Tabela
          legenda="Transações"
          dados={d.transacoes}
          vazio="Nenhuma transação ainda. Faça uma assinatura de teste para ver aqui."
          colunas={[
            { titulo: 'Data', render: (t) => formatarData(t.data_transacao) },
            { titulo: 'Cliente', render: (t) => (t.usuario ? <Link to={`/admin/usuarios/${t.usuario.id}`}>{t.usuario.nome}</Link> : '—') },
            { titulo: 'Descrição', campo: 'descricao' },
            { titulo: 'Método', campo: 'metodo_pagamento' },
            { titulo: 'Valor', render: (t) => formatarMoeda(t.valor), alinhar: 'direita' },
            { titulo: 'Status', render: (t) => <Etiqueta tom={TOM[t.status] || 'neutro'}>{t.status}</Etiqueta> },
            {
              titulo: 'Ações',
              render: (t) =>
                podeReembolsar && t.status === 'aprovada' && t.valor > 0 ? (
                  <Botao variante="fantasma" tamanho="pequeno" onClick={() => setAlvo(t)}>Reembolsar</Botao>
                ) : null,
            },
          ]}
        />
      </section>

      <Modal
        aberto={Boolean(alvo)}
        titulo="Reembolsar pagamento?"
        aoFechar={() => setAlvo(null)}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setAlvo(null)}>Cancelar</Botao>
            <Botao variante="perigo" carregando={salvando} disabled={motivo.trim().length < 5} onClick={reembolsar}>Reembolsar {alvo && formatarMoeda(alvo.valor)}</Botao>
          </>
        }
      >
        <p>O valor volta para {alvo?.usuario?.nome} e o plano pago desta compra é encerrado na hora.</p>
        <AreaTexto rotulo="Motivo (vai para a auditoria)" obrigatorio value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
      </Modal>
    </>
  );
}
