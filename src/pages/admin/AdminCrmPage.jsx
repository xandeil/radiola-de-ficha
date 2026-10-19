import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarregar } from '@/hooks/useCarregar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { adminService } from '@/services/adminService';
import { temPermissao } from '@/utils/permissoes';
import TituloPagina from '@/components/ui/TituloPagina';
import Botao from '@/components/ui/Botao';
import { Caixa } from '@/components/ui/Campo';
import { Carregando, EstadoErro } from '@/components/ui/Estados';
import Tabela, { Etiqueta } from '@/components/ui/Tabela';
import { tempoRelativo } from '@/utils/formatadores';
import styles from './Admin.module.css';

/*
 * CRM (seções 9.3 e 9.4).
 * Segmento = REGRA ("sem login há 30 dias"), não lista fixa: a lista é
 * recalculada toda vez, então quem voltou a usar sai sozinho do segmento.
 * Automação = segmento + mensagem. Executar não reenvia para quem já
 * recebeu a mesma nos últimos 7 dias.
 */
export default function AdminCrmPage() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const { dados: d, carregando, erro, recarregar } = useCarregar(() => adminService.crm(), []);
  const [segmento, setSegmento] = useState('novos');
  const [executando, setExecutando] = useState(null);
  const podeExecutar = temPermissao(usuario, 'crm.executar');

  if (carregando && !d) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarDeNovo={recarregar} />;

  const escolhido = d.segmentos.find((s) => s.chave === segmento);

  const alternar = async (id) => {
    try {
      await adminService.alternarAutomacao(id);
      recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    }
  };

  const executar = async (id) => {
    setExecutando(id);
    try {
      const r = await adminService.executarAutomacao(id);
      mostrar(`${r.enviados} e-mails enviados` + (r.ignorados ? ` · ${r.ignorados} já tinham recebido nesta semana` : ''));
      recarregar();
    } catch (e) {
      mostrar(e.message, { tipo: 'erro' });
    } finally {
      setExecutando(null);
    }
  };

  return (
    <>
      <TituloPagina sobretitulo="Painel" titulo="CRM e automações" subtitulo="Quem são seus clientes agora, e o que dizer a cada grupo." />

      <section className={styles.cartao}>
        <h2>Segmentos</h2>
        <div className={styles.segmentos}>
          {d.segmentos.map((s) => (
            <button key={s.chave} type="button" className={styles.segmento} aria-pressed={s.chave === segmento} onClick={() => setSegmento(s.chave)}>
              <strong>{s.usuarios.length}</strong>
              {s.nome}
              <br />
              <small>{s.regra}</small>
            </button>
          ))}
        </div>
        <h3>{escolhido.nome}</h3>
        {escolhido.usuarios.length ? (
          <ul className={styles.lista}>
            {escolhido.usuarios.map((u) => (
              <li key={u.id}>
                <Link to={`/admin/usuarios/${u.id}`}>{u.nome}</Link>
                <span className={styles.muted}>{u.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>Ninguém neste segmento agora.</p>
        )}
      </section>

      <section className={styles.cartao}>
        <h2>Automações</h2>
        {d.automacoes.map((a) => (
          <div key={a.id} className={styles.automacao}>
            <div>
              <strong>{a.nome}</strong> <Etiqueta tom={a.ativa ? 'sucesso' : 'neutro'}>{a.ativa ? 'Ativa' : 'Pausada'}</Etiqueta>
              <p className={styles.muted}>
                {a.descricao} · para “{d.segmentos.find((s) => s.chave === a.segmento)?.nome}”
                {a.ultima_execucao && ` · última execução ${tempoRelativo(a.ultima_execucao)}`}
              </p>
              <p className={styles.muted}>Assunto: “{a.assunto}”</p>
            </div>
            {podeExecutar && (
              <div className={styles.acoes} style={{ marginTop: 0 }}>
                <Caixa rotulo="Ativa" checked={a.ativa} onChange={() => alternar(a.id)} aria-label={`Ativar ${a.nome}`} />
                <Botao variante="secundario" tamanho="pequeno" disabled={!a.ativa} carregando={executando === a.id} onClick={() => executar(a.id)}>
                  Executar agora
                </Botao>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className={styles.cartao}>
        <h2>E-mails enviados</h2>
        <Tabela
          legenda="E-mails enviados"
          dados={d.emails}
          vazio="Nenhum e-mail enviado ainda. No servidor real isso roda num cron diário."
          colunas={[
            { titulo: 'Quando', render: (e) => tempoRelativo(e.data) },
            { titulo: 'Para', campo: 'para' },
            { titulo: 'Assunto', campo: 'assunto' },
            { titulo: 'Status', render: (e) => <Etiqueta tom="sucesso">{e.status}</Etiqueta> },
          ]}
        />
      </section>
    </>
  );
}
