import { useState } from 'react';
import { useCarregar } from '@/hooks/useCarregar';
import { useToast } from '@/contexts/ToastContext';
import { useManutencao } from '@/contexts/ManutencaoContext';
import { manutencaoService } from '@/services/manutencaoService';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import Alerta from '@/components/ui/Alerta';
import { AreaTexto, Caixa, Entrada, Selecao } from '@/components/ui/Campo';
import { ModalConfirmacao } from '@/components/ui/Modal';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela from '@/components/ui/Tabela';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

/*
 * Modo manutenção (Anexo 2). Só o superusuário vê esta tela.
 *
 * Emergencial = liga AGORA (servidor caiu, falha de segurança).
 * Programada = liga e desliga sozinha numa janela (atualização planejada);
 *   os usuários veem um aviso nas 24h anteriores (RF109).
 * Silenciosa = registra a janela mas não bloqueia ninguém (mudanças pequenas).
 */

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
/** Valor para <input type="datetime-local"> no fuso local. */
const paraInput = (data) => new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const ROTULO_ACAO = {
  ativou_manutencao: 'Ativou a manutenção',
  agendou_manutencao: 'Agendou uma janela',
  desativou_manutencao: 'Desativou',
  acesso_durante_manutencao: 'Entrou durante a manutenção',
};

export default function AdminManutencaoPage() {
  const { mostrar } = useToast();
  const { atualizar } = useManutencao();
  const { dados: c, carregando, erro, recarregar } = useCarregar(() => manutencaoService.config(), []);
  const [emergencia, setEmergencia] = useState({ motivo: '', duracao: '60' });
  const [confirmar, setConfirmar] = useState(false);
  const daqui = (h) => paraInput(new Date(Date.now() + h * 3600000));
  const [janela, setJanela] = useState({ inicio: daqui(24), fim: daqui(26), motivo: 'Atualização da vitrola', descricao: '', silenciosa: false });
  const [pagina, setPagina] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  if (carregando && !c) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const textos = pagina || { titulo: c.titulo_personalizado, mensagem: c.mensagem_personalizada };
  const e = c.estado;

  const acao = async (fn, msg) => {
    setOcupado(true);
    try {
      await fn();
      mostrar(msg);
      recarregar();
      atualizar(true); // avisa o resto do app (banner/portão) na hora
      return true;
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const ligar = async () => {
    const ok = await acao(() => manutencaoService.ativarEmergencial({ motivo: emergencia.motivo, duracaoMin: Number(emergencia.duracao) || null }), 'Manutenção emergencial ATIVADA');
    if (ok) setConfirmar(false);
  };

  const situacao = e.em_manutencao
    ? `EM MANUTENÇÃO (${e.tipo})${e.fim_previsto ? ` até ${fmt(e.fim_previsto)}` : ' sem previsão de fim'}`
    : e.agendada
      ? `Agendada: ${fmt(e.inicio)} → ${fmt(e.fim_previsto)}`
      : c.ativo && e.tipo === 'silenciosa'
        ? `Janela silenciosa registrada até ${fmt(e.fim_previsto)}`
        : 'Sistema no ar';

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="Modo manutenção" subtitulo="Tire a Radiola do ar com segurança, avisando os usuários." />

      <section className={styles.cartao}>
        <div className={styles.estadoManutencao}>
          <span className={styles.luz} data-ligada={e.em_manutencao} aria-hidden="true" />
          <strong data-testid="situacao-manutencao">{situacao}</strong>
          {c.ativo && (
            <Botao variante="secundario" carregando={ocupado} onClick={() => acao(() => manutencaoService.desativar(), 'Manutenção desativada: sistema no ar')}>
              {e.em_manutencao ? 'Desativar agora' : 'Cancelar janela'}
            </Botao>
          )}
        </div>
        {e.em_manutencao && <p className={styles.muted}>Você (superusuário) continua navegando normalmente; clientes veem a página de manutenção.</p>}
      </section>

      <div className={styles.graficos}>
        <section className={styles.cartao}>
          <h2>Emergencial</h2>
          <div className={styles.formulario}>
            <Entrada rotulo="Motivo exibido aos usuários" obrigatorio value={emergencia.motivo} onChange={(ev) => setEmergencia((s) => ({ ...s, motivo: ev.target.value }))} placeholder="Ex.: Corrigindo instabilidade no login" />
            <Selecao
              rotulo="Duração estimada"
              vazio={null}
              opcoes={[
                { valor: '15', rotulo: '15 minutos' },
                { valor: '30', rotulo: '30 minutos' },
                { valor: '60', rotulo: '1 hora' },
                { valor: '240', rotulo: '4 horas' },
                { valor: '', rotulo: 'Indeterminado (até eu desligar)' },
              ]}
              value={emergencia.duracao}
              onChange={(ev) => setEmergencia((s) => ({ ...s, duracao: ev.target.value }))}
            />
            <Botao variante="perigo" disabled={!emergencia.motivo.trim() || e.em_manutencao} onClick={() => setConfirmar(true)}>
              Ativar agora
            </Botao>
          </div>
        </section>

        <section className={styles.cartao}>
          <h2>Programar janela</h2>
          <div className={styles.formulario}>
            <div className={styles.linha2}>
              <Entrada rotulo="Início" type="datetime-local" value={janela.inicio} onChange={(ev) => setJanela((s) => ({ ...s, inicio: ev.target.value }))} />
              <Entrada rotulo="Fim" type="datetime-local" value={janela.fim} onChange={(ev) => setJanela((s) => ({ ...s, fim: ev.target.value }))} />
            </div>
            <Entrada rotulo="Motivo público" value={janela.motivo} onChange={(ev) => setJanela((s) => ({ ...s, motivo: ev.target.value }))} />
            <AreaTexto rotulo="Descrição técnica (só equipe)" rows={2} value={janela.descricao} onChange={(ev) => setJanela((s) => ({ ...s, descricao: ev.target.value }))} />
            <Caixa rotulo="Silenciosa (registra, mas não bloqueia ninguém)" checked={janela.silenciosa} onChange={(ev) => setJanela((s) => ({ ...s, silenciosa: ev.target.checked }))} />
            <Botao variante="secundario" carregando={ocupado} disabled={!janela.motivo.trim()} onClick={() => acao(() => manutencaoService.agendar(janela), 'Janela agendada')}>
              Agendar
            </Botao>
          </div>
        </section>
      </div>

      <section className={styles.cartao}>
        <h2>Página de manutenção</h2>
        <div className={styles.formulario}>
          <Entrada rotulo="Título" maxLength={80} value={textos.titulo} onChange={(ev) => setPagina({ ...textos, titulo: ev.target.value })} />
          <AreaTexto rotulo="Mensagem" rows={3} maxLength={400} value={textos.mensagem} onChange={(ev) => setPagina({ ...textos, mensagem: ev.target.value })} />
          <div className={styles.acoes} style={{ marginTop: 0 }}>
            <Botao variante="secundario" carregando={ocupado} disabled={!pagina || !textos.titulo.trim()} onClick={() => acao(() => manutencaoService.personalizar(textos), 'Texto atualizado').then((ok) => ok && setPagina(null))}>
              Salvar texto
            </Botao>
            <Botao variante="fantasma" para="/manutencao/previa">Ver prévia</Botao>
          </div>
        </div>
      </section>

      <div className={styles.graficos}>
        <section className={styles.cartao}>
          <h2>Histórico de janelas</h2>
          <Tabela
            legenda="Histórico de manutenções"
            chave="encerrada_em"
            dados={c.historico}
            vazio="Nenhuma manutenção ainda."
            colunas={[
              { titulo: 'Tipo', campo: 'tipo' },
              { titulo: 'Início', render: (h) => fmt(h.inicio) },
              { titulo: 'Encerrada', render: (h) => `${fmt(h.encerrada_em)} (${h.encerrada_por})` },
              { titulo: 'Motivo', campo: 'motivo' },
            ]}
          />
        </section>
        <section className={styles.cartao}>
          <h2>Acessos e ações</h2>
          {c.acessos.length ? (
            <ul className={styles.lista}>
              {c.acessos.map((a) => (
                <li key={a.id}>
                  <span>{a.nome} · {ROTULO_ACAO[a.acao] || a.acao}</span>
                  <span className={styles.muted}>{tempoRelativo(a.data_acesso)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Nada registrado.</p>
          )}
        </section>
      </div>

      {e.em_manutencao && <Alerta tipo="aviso">Lembrete: o cache de status dura 60 segundos. Usuários com a página aberta percebem a mudança em até 1 minuto.</Alerta>}

      <ModalConfirmacao
        aberto={confirmar}
        titulo="Tirar a Radiola do ar agora?"
        mensagem="Todos os usuários (menos a equipe) passam a ver a página de manutenção imediatamente."
        textoConfirmar="Sim, ativar manutenção"
        perigo
        carregando={ocupado}
        aoConfirmar={ligar}
        aoFechar={() => setConfirmar(false)}
      />
    </>
  );
}
